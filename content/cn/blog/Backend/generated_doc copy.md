---
title: '基于 LangGraph 与规则 RAG 的多 Agent 智能文档生成与有环自愈系统实现'
date: 2026-07-27
summary: '详细介绍了基于 LangGraph 的智能文档生成系统的架构设计，包括状态字典，动态审查管线，规则 RAG，多源适配器与多 Agent 并发生成等核心机制。'
tags: ['大模型', 'Python', 'RAG', 'Agent', 'LangGraph']
categories: ['技术文档']
draft: false
---

## 1. 状态机设计

> 在 `LangGraph` 框架下，节点（Node）扮演着执行计算或调用大模型的函数角色，而边（Edge）则决定了流转逻辑。

系统基于 LangGraph 编排与规则 RAG 检索构建闭环工程架构。全流程涵盖多源输入解析、并发初稿生成以及六组模块化的审查与自愈修改闭环，系统的总体节点流转路线如下图所示：

![LangGraph 状态机节点执行拓扑图](/Docsy/images/nodemap.png)

*图 1：LangGraph 状态机节点拓扑路线*

为了连接上述各个节点与边并支撑整个状态机的精确运转，系统定义了 `DocState` 状态字典作为全局数据中枢，其实现位于 `src/agent/state.py` 文件中。

在 `LangGraph` 的执行模型里，每一个节点接收当前状态的快照，执行完计算后返回状态的增量更新，框架随即将其合并回全局状态。因此，`DocState` 的字段设计直接决定了整个有向有环图的记忆能力与控制精度。一个考虑周全的状态定义，能够让节点之间无需借助外部全局变量便可无缝协作；反之，字段缺失或语义混乱则会让整个自愈循环失去可控性。

### 1.1 基础上下文

不同于单纯的文本生成工具，技术文档生成系统需要支持多种数据处理场景，因此在 `DocState` 中首先定义了一批承载基础输入与上下文的字段：

```python
class DocState(TypedDict, total=False):
    input_mode: Literal["text", "notes", "code"]
    topic: str
    context: str
    source_path: str
    current_draft: str
    review_comments: List[str]
```

这里有两个值得注意的工程细节。其一，`DocState` 继承自 `TypedDict` 并显式声明了 `total=False`，这意味着所有字段都是可选的。在多源适配、并发生成与循环审查的复杂流转中，并非每个节点都会填充全部字段，`total=False` 让状态在不同阶段能够以“渐进式填充”的方式演进，避免了在初始化时被迫填入大量占位值。其二，字段类型标注（如 `Literal` 与 `List`）不仅仅是文档提示，更为下游节点的静态检查与条件路由提供了明确契约。

具体到各字段的职责：

* `input_mode` 指明了当前的输入源类型，取值被严格约束为 `text`（直接纯文本输入）, `notes`（Markdown 笔记解析）, `code`（本地代码库扫描）三者之一。它决定了状态机在初始化后将通过条件路由进入哪一个专用的解析节点，是整个输入分发与解析逻辑的开关。
* `topic` 与 `source_path` 承载了文档主题与输入源的物理路径，供解析节点定位与读取原始素材。
* `context` 是多源归一化后的统一上下文载体。无论输入是散碎笔记还是庞大源码目录，最终都会被清洗汇聚到这个字段，确保下游生成节点接收到格式一致的输入。
* `current_draft` 与 `review_comments` 分别记录当前生成到的文档内容与历史审查反馈。它们构成了系统的“短期记忆”，确保每次大模型介入时都能读取到最新的草稿版本与既往违规意见，从而避免重复犯错。

### 1.2 管线控制字段

为了在有向有环状态机中精确控制循环次数与审查进度，`DocState` 中定义了一组专用于管线追踪与控制的字段：

```python
    # 动态审查管线专属状态
    review_pipeline: List[str]      # 存储当前启用的所有模块的 mod_key
    current_review_index: int       # 当前审查进行到了哪个模块的索引
    iteration_counts: Dict[str, int] # 动态存储每个模块的重试次数
    
    prev_violation_count: int
    violation_history_cache: List[str]
    is_valid: bool
    cache_dir: str
```

这组字段在状态机中实现了类似传统 `while` 循环的控制逻辑：

* `review_pipeline` 保存了所有需要被核对的排版规则模块标识（即 `mod_key`，例如元数据结构模块, 符号规范模块等）。它本质上是一个待执行的审查任务队列，其长度直接界定了循环的总次数上限。
* `current_review_index` 与 `iteration_counts` 就像是传统循环中的指针与计数器。前者标记当前审查进行到了哪一个模块，后者则以字典形式动态记录每个模块各自的重试次数。二者配合，既能保证审查按序推进，也能在单个模块反复不达标时及时熔断，防止无限死循环的发生。
* `is_valid` 是本轮审查的核心结论标志位。当某个模块未达到通过标准（即 `is_valid` 为 `False`）时，状态机将进入修改分支进行定向重试；反之则推进到下一模块。这一布尔值正是第 2 节条件路由函数分发控制流的关键依据。
* `prev_violation_count` 与 `violation_history_cache` 承担了跨轮次的“回溯记忆”职责。前者缓存上一轮的违规项数量，用于判断修改是否真正带来了收敛（而非越改越糟）；后者则完整保留违规历史，为调试与效果评估提供数据支撑。
* `cache_dir` 指向落盘缓存目录，配合并发生成与断点续跑机制，即便出现网络抖动也能从中间产物无缝恢复。

综合来看，`DocState` 的字段划分为上下文传递与管线控制提供了明确的职责边界，为后续生成与审查提供了统一的数据中枢。




## 2. 动态路由编排

在 `DocState` 的基础之上，系统通过 `LangGraph` 构建有环状态图（Cyclic Graph）。控制流程分发与循环编排的核心实现位于 `src/agent/graph.py` 中。

不同于抽象的单节点循环逻辑，系统采用了 **“多入口动态分发”** 与 **“规则模块全节点展平展开注册（Fully Expanded Node Registration）”** 的闭环工程架构，确保状态图既具备运行时的自愈修改能力，又能在拓扑渲染（如 `draw_mermaid_png`）中展现清晰可追踪的物理节点连线。

### 2.1 多入口条件分发

在图初始化阶段，系统通过 `set_conditional_entry_point` 注册入口动态路由函数 `route_entry`，根据 `DocState` 中的 `input_mode` 将控制流精准导向对应的上下文归一化解析节点：

```python
# 1. 动态多入口路由
def route_entry(state: DocState) -> str:
    mode = state.get("input_mode", "text")
    if mode == "notes":
        return "process_notes"
    elif mode == "code":
        return "scan_code"
    else:
        return "process_text"

workflow.set_conditional_entry_point(
    route_entry,
    {
        "process_text": "process_text",
        "process_notes": "process_notes",
        "scan_code": "scan_code"
    }
)

# 入口节点统一汇合流向初稿生成节点
workflow.add_edge("process_text", "generate_draft")
workflow.add_edge("process_notes", "generate_draft")
workflow.add_edge("scan_code", "generate_draft")
```

无论是纯文本说明 (`process_text`)、Markdown 笔记 (`process_notes`) 还是代码探索扫描 (`scan_code`)，在完成各自领域的清洗与上下文归一化后，均通过普通边统一流向 `generate_draft` 节点进行初稿规划与并发撰写。

### 2.2 全节点展平编排与闭环路由

为了使排版审查的流水线在可视化视图中清晰可见，系统从 `rule_repo.get_available_modules()` 动态读取所有规范模块标识（`mod_key`），并在图中为每个模块独立注册对应的审查节点与修改节点：

```python
# 动态获取所有审查模块，并在 LangGraph 中展开注册对应的审查与修补节点
available_modules = rule_repo.get_available_modules()

for mod_key in available_modules:
    workflow.add_node(f"review_{mod_key}", generic_review_node)
    workflow.add_node(f"revise_{mod_key}", generic_revise_node)

# 初稿生成后，流向第一个展开注册的审查节点
first_review_node = f"review_{available_modules[0]}" if available_modules else END
workflow.add_edge("generate_draft", first_review_node)
```

在链式路由构建阶段，系统通过循环为每个模块构造独立的判定函数闭包 `make_check_func(i)`，并配合显式路径映射表 `review_path_map` 实现运行时分发：

```python
# 为每个审查节点准备显式路由映射 Path Map
for i, mod_key in enumerate(available_modules):
    curr_review = f"review_{mod_key}"
    curr_revise = f"revise_{mod_key}"
    next_review = f"review_{available_modules[i+1]}" if i + 1 < len(available_modules) else END
    
    review_path_map = {
        "pass": next_review,
        "fail": curr_revise
    }
    
    def make_check_func(module_index: int):
        def check_func(state: DocState) -> str:
            if state.get("is_valid", False):
                return "pass"
            else:
                return "fail"
        return check_func
        
    workflow.add_conditional_edges(curr_review, make_check_func(i), review_path_map)
    
    # 修补节点完成后，闭环反向边流回对应的审查节点进行重新复查
    workflow.add_edge(curr_revise, curr_review)
```

#### 2.2.1 推进路由分支 ("pass")

当审查节点 `review_{mod_key}` 执行完毕且状态标志 `is_valid` 为 `True` 时，闭包判定函数返回 `"pass"`。根据 `review_path_map` 映射，控制流自动推进至下一个模块的审查节点 `review_{available_modules[i+1]}`。若当前已是最后一个规范模块，则指向 `END` 完成全图执行。

#### 2.2.2 自愈闭环分支 ("fail")

若草稿在该模块被判定为存在违规（`is_valid` 为 `False`），闭包判定函数返回 `"fail"`，路由指向该模块专属的修改节点 `revise_{mod_key}`。

#### 2.2.3 模块级反向复查边

修改节点 `revise_{mod_key}` 执行局部替换修补后，通过普通边 `workflow.add_edge(curr_revise, curr_review)` 重新送回该模块的审查节点接受再次检验。这一设计确保了每轮修复结果都经过该模块的严格复查，直至达成通过条件。

#### 2.2.4 拓扑流转视图

上述多入口与展平节点的编排结构如下图所示：

{{< mermaid size="xl" >}}
graph TD;
    START([START]) -.->|"route_entry"| R{输入模式路由};
    R -->|text| PT[process_text];
    R -->|notes| PN[process_notes];
    R -->|code| SC[scan_code];
    PT --> GD[generate_draft];
    PN --> GD;
    SC --> GD;
    
    GD --> R1[review_metadata_and_structure];
    R1 -.->|"make_check_func"| C1{校验判定};
    C1 -->|"fail: 违规"| V1[revise_metadata_and_structure];
    V1 --> R1;
    C1 -->|"pass: 通过"| R2[review_typography_and_symbols];
    
    R2 -.->|"make_check_func"| C2{校验判定};
    C2 -->|"fail: 违规"| V2[revise_typography_and_symbols];
    V2 --> R2;
    C2 -->|"pass: 推进"| RN[...后续规则模块审查...];
    RN --> E([END 输出终稿]);
{{< /mermaid >}}

该架构既实现了排版规范维度的模块解耦，又通过显式节点声明保障了整个自愈系统在工程层面易于调试与静态可视化。

下一步，审查节点调用基于规则 RAG（Retrieval-Augmented Generation）的检索机制，匹配具体排版规范执行校验。

## 3. 规则 RAG 审查

在审查节点中，系统采用规则 RAG（Rule-based RAG）架构。通过本地向量化检索，按需匹配当前模块对应的排版规则条目，避免将完整规范文档整体塞入 Prompt 导致的注意力分散。

> RAG（Retrieval-Augmented Generation，检索增强生成）是一种在模型生成前，先从外部知识库中检索出相关片段，再将其注入提示词以约束与增强模型输出的技术范式。

### 3.1 向量数据库与 Embedding 选型

在构建基于规则 RAG 的文档审查机制前，需要明确向量嵌入（Embedding）与向量数据库的核心概念及其工程价值：

* **Embedding (向量嵌入)**：一种将非结构化文本（如排版规范条文、代码片段）映射为固定维度高维数值向量（Numeric Vector）的算法表达形式。通过深度神经网络建立高维空间映射，将自然语言的语义特征转化为空间坐标，使原本无法量化的语义关联能够通过向量夹角余弦（Cosine Similarity）或欧氏距离进行数学度量。
* **向量数据库 (Vector Database)**：专门用于存储、管理高维数值向量并执行高效相似度检索（Nearest Neighbor Search, K-NN / ANN）的专用数据库系统。相较于传统基于字符串精确匹配的 SQL 数据库或倒排索引，向量数据库通过高维空间索引结构（如 HNSW、IVF）实现在高维数据下的毫秒级语义相似度检索。
* **引入 Embedding 与向量数据库的原因**：在智能文档生成与审查流程中，排版规范文档包含多维度细则。若采用常规关键字搜索，极易因措辞差异（例如“行号替换”与“代码坐标”）导致检索遗漏；若将全量规范直接拼接到提示词中，会导致大模型注意力分散、产生幻觉并消耗大量计算 Token。利用 Embedding 抽取规范的深层语义特征，结合向量数据库准确定位并检索与当前审查模块最契合的规则片段，实现了高准确率与低 Token 消耗的平衡。

基于上述原理，系统在排版规则 RAG 场景中的具体技术选型与工程设计如下：

* **嵌入式架构与零服务开销**：排版规范文档属于中小型静态知识库，无需部署复杂的分布式向量数据库集群（如 Milvus 或 Qdrant）。系统选用轻量级嵌入式向量数据库 **Chroma DB**，作为 Python 进程内部组件运行。
* **本地持久化与缓存恢复**：Chroma DB 结合 SQLite 与 Parquet 将向量索引直接落盘持久化至 `./rules_db` 目录。在初始化与二次运行阶段，系统直接加载本地索引文件，减少重复向量化计算与网络 API 开销。
* **火山方舟 Embedding 模型接入**：在生成文本向量表示时，系统对接 **火山方舟（Ark）向量 Embedding 模型**（或 Doubao Embedding 接口）。文本切片传入 Embedding 服务后提取高维向量，捕捉排版规则条目与具体审查模块之间的语义关联。

### 3.2 Markdown 到 RAG 的结构化切分

在 `src/agent/ingest_rules.py` 中，系统实现了从原始 Markdown 规范文档（如 `DOC_GUIDELINES.md`）到规则 RAG 向量记忆的全流程解析与构建。

为了保证检索到的排版规则具备完整的上下文语义，系统避免使用固定的字符长度进行盲目分割，而是采用两阶段切分与层级上下文注入算法：

1. **标题结构感知切分**：使用 `MarkdownHeaderTextSplitter` 按照 `##`（Module）与 `###`（Section）标题层级进行语义切分，将文档解构成保留 Markdown 结构的节点。
2. **长度控制二次切分**：通过 `RecursiveCharacterTextSplitter`（设置 `chunk_size=500`，`chunk_overlap=50`）对超长段落进行二次微切分，将切片 Token 规模控制在合适区间。
3. **上下文层级注入**：将元数据中的标题路径提取并拼接到切片正文前缀（如 `【所属章节：Module > Section】`），使得单个规则切片在向量化和检索阶段均带有明确的所属维度信息。

完整的规则切片与向量化构建逻辑如下：

```python
    # 1. 结构感知切分：按 Markdown 标题层级切分
    headers_to_split_on = [
        ("##", "Module"),
        ("###", "Section")
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    md_splits = markdown_splitter.split_text(content)
    
    # 2. 长度控制与二次切分
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs = text_splitter.split_documents(md_splits)
    
    # 3. 注入所属章节上下文
    for doc in docs:
        header_context = " > ".join(doc.metadata.values())
        doc.page_content = f"【所属章节：{header_context}】\n{doc.page_content}"

    # 4. 向量化与 Chroma DB 持久化（结合火山方舟 Ark Embedding）
    vector_store = Chroma.from_documents(
        documents=docs,
        embedding=volcengine_ark_embeddings,
        persist_directory="./rules_db"
    )
```

### 3.3 规则动态检索与动态兜底机制

在 `generic_review_node` 中，审查节点并不直接读取静态文件，而是通过单例 `rule_repo`（实现于 `src/agent/guidelines.py` 中的 `RuleRepository`）发起基于 RAG 的规则检索。

#### 3.3.1 延迟初始化与中英文模块映射

为了防止在模块导入阶段即触发向量数据库加载并造成 SQLite 文件锁争用，`RuleRepository` 采用 **延迟初始化 (Lazy Initialization)** 策略，仅在首次发起审查检索时通过 `_init_db()` 加载 `./rules_db`。

同时，为了弥补系统内部模块键（如 `metadata_and_structure`）与中文规范文本之间的语义鸿沟，`RuleRepository` 维护了中英文映射矩阵，并拼接带有明确领域意图的中文检索 Prompt：

```python
    # 内部中英文模块映射
    self.module_name_mapping = {
        "metadata_and_structure": "元数据与结构",
        "typography_and_symbols": "排版与符号",
        "code_and_diagrams": "代码与图表",
        "specific_sections": "特定章节",
        "naming_and_tags": "命名白名单",
        "content_style": "内容风格"
    }

    # 动态构建基于中文意图的检索 Query
    mod_name = self.module_name_mapping.get(mod_key, mod_key)
    search_query = f"这是关于【{mod_name}】模块的排版规范与审查规则"
    raw_results = self.rules_store.similarity_search_with_relevance_scores(search_query, k=50)
```

#### 3.3.2 精确二次过滤与 TOP-3 动态兜底

由于高维向量相似度检索可能返回相关性较低的交叉维度条目，`RuleRepository` 在获取 `k=50` 的候选集后实施了**二次文本匹配过滤**与 **熔断兜底 (Fallback)** 机制：

```python
    # 1. 过滤：强制要求匹配到的条目必须包含当前模块中文名称
    results_with_scores = []
    for doc, score in raw_results:
        if mod_name in doc.page_content:
            results_with_scores.append((doc, score))
    
    results_with_scores = sorted(results_with_scores, key=lambda x: x[1], reverse=True)
    
    # 2. 兜底：若精准匹配结果为空，自动退回并提取相似度最高的 Top 3 规则
    if not results_with_scores:
        logger.info(f" ⚠️ [Rule RAG] 未找到精准匹配规则，触发兜底机制，返回得分最高的前 3 条。")
        results_with_scores = sorted(raw_results, key=lambda x: x[1], reverse=True)[:3]
        
    results = [doc for doc, _ in results_with_scores]
    retrieved_rules = "\n".join([f"- {doc.page_content}" for doc in results])
```

#### 3.3.3 Prompt 刚性注入与校验契约

检索到的条目被直接注入当前审查专家 Agent 的系统 Prompt：

```python
    prompt = f"""
    你是一名专属的【{mod_name}】审查专家。
    你的唯一职责是严格对照下方的【特定模块审查规范】，专门审查草稿中属于【{mod_name}】领域的内容。
    
    【特定模块审查规范】:
    {retrieved_rules}
    
    【待审查草稿】:
    {draft}
    """
```

区别于开放问答场景，规则 RAG 在此充当刚性校验规则库。结合 `ReviewResult` 校验拦截器，要求模型输出必须带有对应规则编号（如 `1.2 标题层级错误`），确保审查意见的准确性与后续自愈修改的精准落地执行。




## 4. 多源并发生成

初始草稿生成阶段负责处理各类非结构化或半结构化的原始输入。针对文本说明、Markdown 笔记或代码库目录等输入形态，系统通过多源适配器与“大纲-并发生成”模式完成解析与初稿构建。

### 4.1 多源上下文归一化

要让下游的生成节点无需关心输入源的差异，关键在于建立一个统一的“归一化层”。针对 `DocState` 中传入的不同 `input_mode`，系统在 `src/agent/nodes.py` 中实现了三条并行的归一化路径，其最终目标高度一致：无论上游千差万别，都要向 `generate_draft` 节点交付一份格式统一的 `context`。

1. **纯文本模式 (`process_text` 节点)**：这是最轻量的路径，系统原样透传用户直接输入的文本，仅做基础的清洗与封装，适用于用户已经心中有数的快速成文场景。
2. **笔记模式 (`process_notes` 节点)**：系统会自动读取用户指定的 `.md` 笔记文件，将其内容解析后追加到上下文中，特别适合把平日积累的零散知识点一键升格为规范文档。
3. **代码扫描模式 (`scan_code` 节点)**：在此模式下，系统启动 Agentic Code Scanner 对代码库进行结构化探索。

代码扫描模式的精髓在于“让 AI 自己去读代码”，而非把整个代码库不加筛选地灌入上下文窗口。其核心实现如下：

```python
    # 绑定代码探索工具进行自主检索
    collected_context = client.bind_tools_and_explore(
        system_prompt="你是一个专业的代码探索 Agent。",
        user_prompt=prompt,
        tools=[search_keyword, read_file, get_file_outline, fetch_webpage, get_current_date_from_network]
    )
```

在 `scan_code` 执行过程中，系统首先会使用正则表达式配合 LLM，从输入信息里提取外部参考链接并进行预抓取，确保后续行文的引用素材齐备。随后，通过向探索 Agent 赋予关键字搜索（search_keyword）, 查看文件大纲（get_file_outline）与读取切片（read_file）等一系列工具权限，让 AI 得以像一位资深架构师阅读陌生项目那样工作：先俯瞰文件概貌与目录结构，再顺着关键业务线索按需钻研核心逻辑，最终输出一份高精炼度的项目业务概览。这种'先扫描后聚焦'的策略，既避免了长上下文带来的注意力涣散，也保证了归一化后的 `context` 始终紧扣文档主题。

### 4.2 多 Agent 并发撰写

当归一化的上下文准备完毕后，流程进入 `generate_draft` 节点。针对长文本生成场景，系统采用“规划（Plan）与执行（Execute）分层”的多 Agent 并发架构，将大纲划分与具体章节撰写相解耦。

```python
    # 1. 结构化规划：优先生成 MECE 规范大纲
    outline = client.generate_structured(
        system_prompt="你是一个资深技术文档架构师。",
        user_prompt=outline_prompt,
        schema=Outline
    )
    
    # 2. 并发执行：根据大纲规模动态分配并发线程撰写各个章节
    dynamic_workers = max(1, math.ceil(len(outline.sections) / 3))
    with ThreadPoolExecutor(max_workers=dynamic_workers) as executor:
        futures = {
            executor.submit(generate_single_section, i, section): i 
            for i, section in enumerate(outline.sections)
        }
```

在第一阶段的规划环节，系统通过结构化输出模型生成一份满足 MECE（Mutually Exclusive, Collectively Exhaustive，相互独立，完全穷尽）原则的章节大纲。

> MECE（Mutually Exclusive, Collectively Exhaustive，相互独立、完全穷尽）是一种结构化拆分原则，要求各部分之间彼此互斥不重叠，合并起来又能完整覆盖整体，常用于保证大纲划分的严谨性。

在第二阶段执行环节，系统通过 `ThreadPoolExecutor` 启动并发线程，为各大纲章节分配独立的子 Agent 撰写。分治策略提高了生成效率，并避免了单次长文本生成的输出长度限制。

除了并发写作之外，系统配备了细致的落盘缓存机制（目录 `.draft_cache`）。每个子 Agent 完成的章节切片都会被实时持久化，这意味着即便中途遭遇网络抖动或单个线程失败，系统也无需从零重跑全部章节，而是能够从断点无缝恢复，仅补全缺失的部分。最终，所有章节切片按大纲顺序拼接为完整的初稿 `current_draft`，交由下游的审查管线接管。

### 4.3 缓存隔离与断点恢复机制

在多线程并发生成与落盘缓存（`.draft_cache`）中，系统设计了包含“存档目录隔离”、“切片文件物理隔离”以及“WIP 中间稿断点唤醒”的多层级容错与恢复机制，确保长文本生成与循环审查过程的可靠性。

#### 4.3.1 存档目录隔离与恢复

为了防止不同生成任务之间产生脏缓存污染，系统在生成初始化阶段通过全局状态 `DocState` 中的 `cache_dir` 实施命名空间隔离：

```python
    # 1. 动态生成独立存档目录
    cache_dir = state.get("cache_dir")
    if not cache_dir:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_topic = re.sub(r'[\\/*?:"<>|\s]+', "_", topic)[:20].strip("_")
        if not safe_topic:
            safe_topic = "Untitled"
        cache_dir = os.path.join(".draft_cache", f"{timestamp}_{safe_topic}")
    
    os.makedirs(cache_dir, exist_ok=True)
```

当开启新文档生成任务且未指定历史存档时，系统会基于当前时间戳与规范化主题自动创建唯一的缓存子目录（如 `.draft_cache/20260727_143000_Architecture_Overview`）。而在 CLI 模式中，用户也可通过历史存档选项（`Resume from archived draft`）列出所有 `.draft_cache` 目录并指定 `cache_dir`，从而无缝唤醒历史会话。

#### 4.3.2 章节切片物理隔离与并发线程安全

在并发撰写阶段（`generate_draft_node`），大纲结构与各个章节正文以粒度化文件形式实时落盘：

* **大纲结构缓存 (`outline.json`)**：系统优先检查 `cache_dir/outline.json`，若存在则直接反序列化加载 MECE 大纲，避免重新规划的 token 开销；若不存在则调用 LLM 生成并落盘。
* **章节切片物理隔离 (`section_{i}.md`)**：每个章节的撰写任务在单独的子 Agent 线程中运行，并按章节索引落盘为独立文件 `section_{i}.md`。文件名按索引天然隔离，避免了多线程并发写入同一个文件引发的锁争用或写入截断。

同时，系统在多并发调用中引入了动态线程分配与异常隔离机制：

```python
    # 根据大纲章节规模动态分配并发线程
    dynamic_workers = max(1, math.ceil(len(outline.sections) / 3))
    
    with ThreadPoolExecutor(max_workers=dynamic_workers) as executor:
        future_to_index = {
            executor.submit(generate_single_section, i, sec): i 
            for i, sec in enumerate(outline.sections)
        }
        for future in as_completed(future_to_index):
            i = future_to_index[future]
            try:
                draft_parts[i] = future.result()
            except Exception as e:
                logger.error(f"❌ 章节 [{i+1}] 生成失败: {e}")
                draft_parts[i] = f"【章节 {i+1} 生成失败: {e}】"
```

通过 `try...except Exception` 捕获单线程执行异常，当某个章节因网络抖动或超时失败时，系统写入占位提示并继续完成其余章节的拼装，防止单点故障导致整个并发管线崩溃。

#### 4.3.3 WIP 审查中间稿断点唤醒

针对后续循环审查阶段可能发生的网络中断或人工终止，系统在 `generic_revise_node` 中实现了 WIP（Work In Progress）实时 Checkpoint 机制：

```python
    # 每次局部修改完成后，同步更新 WIP 中间稿
    cache_dir = state.get("cache_dir")
    if cache_dir and os.path.exists(cache_dir):
        wip_file = os.path.join(cache_dir, "draft_wip.md")
        with open(wip_file, "w", encoding="utf-8") as f:
            f.write(draft_text)
```

在系统二次启动并加载该存档时，`generate_draft_node` 入口处会优先检索是否存在 `draft_wip.md`：

```python
    # 入口处检测 WIP 中间稿，直接恢复审查进度
    wip_file = os.path.join(cache_dir, "draft_wip.md")
    if os.path.exists(wip_file):
        logger.info(f" 🔍 检测到 WIP 中间修改稿，直接从存档唤醒至最新审查进度...")
        with open(wip_file, "r", encoding="utf-8") as f:
            full_draft = f.read()
        return {
            "current_draft": full_draft,
            "review_pipeline": pipeline,
            "current_review_index": 0,
            "is_valid": False,
            "cache_dir": cache_dir
        }
```

若检测到 `draft_wip.md`，系统将直接装载该修改稿并恢复审查管线队列（`review_pipeline`），完全绕过耗时的大纲生成与章节撰写逻辑，实现从断点处直接继续推进规则审查与自愈修改。

### 4.4 大模型适配接缝与鲁棒生成机制

为了屏蔽不同大模型厂商 API 的协议差异与异常抖动，系统在 `src/agent/llm_client.py` 中实现了统一的大模型适配器接缝（`LlmClient`），将底层的模型选择、超长输出续写、JSON 反序列化以及自我纠错重试封装在内部。

#### 4.4.1 多厂商模型路由适配 (Adapter Seam)

`LlmClient` 在初始化阶段根据配置项 `model_name` 自动进行模型路由：

```python
    def _get_model(self):
        model_name = self.config.get("configurable", {}).get("model_name", os.getenv("MODEL_ID", "..."))
        model_name_lower = model_name.lower()
        
        if "glm" in model_name_lower or "nvidia" in model_name_lower:
            from langchain_nvidia_ai_endpoints import ChatNVIDIA
            return ChatNVIDIA(model=model_name, chat_template_kwargs={"enable_thinking": True, "clear_thinking": False}, ...)
        elif "claude" in model_name_lower:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(model=model_name, ...)
        elif "ep-" in model_name_lower or "doubao" in model_name_lower or "ark" in model_name_lower:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=model_name, base_url=os.getenv("ARK_BASE_URL"), ...)
        else:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model=model_name, ...)
```

针对支持深度思考功能的模型（如 NVIDIA/GLM 节点），配置中自动开启 `enable_thinking` 参数；针对火山方舟 (Ark) 部署的模型，自动对接 OpenAI 兼容协议接口，保证上层节点无需感知模型提供商的底层差异。

#### 4.4.2 文本生成截断判定与无缝自动续写

在撰写长技术章节时，底层 LLM 常受限于最大 Token 输出长度（`max_tokens`）而中断。`LlmClient.generate_text` 实现了基于响应元数据与末尾标点的无缝自动续写机制：

```python
    while True:
        attempt += 1
        response = self.model.invoke(messages)
        content = response.content
        full_content += content
        
        finish_reason = str(response.response_metadata.get("finish_reason", "")).lower()
        if finish_reason in ["stop", "end_turn", "1"]:
            break
            
        # 判定是否因 Token 限制截断，或句子未正常结束
        is_truncated = finish_reason in ["max_tokens", "length", "token_limit", "2"]
        if not is_truncated and not any(content.strip().endswith(c) for c in ['。', '！', '？', '.', '!', '?', '```', '>']):
            is_truncated = True
            
        if is_truncated and attempt < 100:
            logger.info(f"⚠️ [LlmClient] 检测到生成因长度被截断，正在自动触发无缝续写 (第 {attempt} 次续接)...")
            messages.append(response)
            messages.append(HumanMessage(content="你的输出因为长度限制被截断了。请**严格接着你上面输出的最后一个字**继续往下写，绝对不要输出任何前言、总结或重复的内容！"))
            continue
        break
```

一旦捕获到截断，客户端会将上一次的未完响应压入上下文，并注入精准的无缝续接指令，自动循环触发请求（支持上限 100 次续接），保障万字长篇技术文档的完整生成。

#### 4.4.3 结构化数据解析与 Self-Correction 反馈重试

对于大纲生成 (`Outline`) 与局部修改计划 (`RevisePlan`) 等结构化输出节点，`LlmClient.generate_structured` 内置了 Markdown 代码块自动清理与带错误回传的自我纠错（Self-Correction Prompting）机制：

```python
    for attempt in range(max_retries):
        try:
            response = self.model.invoke([SystemMessage(content=full_system_prompt), HumanMessage(content=final_prompt)])
            text = self._strip_markdown_fences(response.content)
            parsed = parser.parse(text)
            if validator: validator(parsed)
            return parsed
        except Exception as e:
            if attempt == max_retries - 1:
                sys.exit(1)
            # 将上一次失败的异常堆栈与原始文本反馈给模型，触发自我纠错
            correction_prompt = f"\n\n【系统提示】：您上一次生成的 JSON 解析失败。异常信息为：{e}\n"
            if raw_text: correction_prompt += f"您上一次输出的内容为：\n{raw_text}\n"
            correction_prompt += "请重新生成，并确保输出完整的、格式完全正确的 JSON！"
            final_prompt += correction_prompt
```

在连续 3 次尝试中，若出现 JSON 语法错误或 Schema 校验不匹配，系统会捕获底层 Exception 字符串，将其作为反思提示追加至 Prompt 尾部，引导模型在下一轮中自动纠正语法错误，显著提升了结构化调用的成功率。

## 5. 局部定向自愈

若当前草稿被判定为不合格（`is_valid` 为 `False`），流程进入 `generic_revise_node` 修改节点。为了避免整体重写导致的原文内容遗失，系统采用“行号编目-规则分组-局部替换”机制进行定向修复。


### 5.1 行号编目与规则分组

在修改节点入口处，系统进行两项预处理：一是对草稿建立固定宽度的带行号坐标系，二是将违规项按规则编号归类。

#### 5.1.1 行号物理坐标系

要让 LLM 具备「按坐标定位」的能力，首先必须为草稿的每一行赋予一个稳定且唯一的物理地址。系统采用了固定宽度的四位数行号前缀方案：

```python
    # 1. 为全篇草稿生成 4 位数行号索引
    draft_lines = draft_text_original.split('\n')
    numbered_draft = "\n".join([f"{i+1:04d}: {line}" for i, line in enumerate(draft_lines)])
```

这里的核心是 Python 格式化字符串中的 `{i+1:04d}` 语法，它将行号强制补零对齐为四位数字（如 `0001`, `0012`, `0345`）。这样处理有两个不可忽视的工程价值：

* **对齐视觉可读性**：固定宽度的编号使得整个带号草稿在提示词中呈现为整齐的列状排版，避免了因行号位数跳变（例如从 9 跳到 10）导致的文本错位，也降低了模型解析坐标时的注意力损耗。
* **建立绝对物理坐标**：经过编号后，原本模糊的「某段落」「某标题」被转化为了 `0042` 这样确定无疑的整数地址。后续 LLM 输出的所有修改指令都将以这套坐标系为唯一基准，为下一小节中「起始行-结束行」的区间替换奠定了基础。

值得强调的是，行号仅作为提示词中的 **导航标记** 存在，它并不属于文档正文。因此在后续小节的替换指令约束中，系统会严令 Agent 输出的 `new_content` 绝不能携带任何行号前缀，避免污染最终落盘的文档内容。

#### 5.1.2 违规项结构化分组

建立坐标系后，第二项预处理是对上一轮审查产生的违规项列表进行结构化归类。`validate_review_result` 拦截器确保每条违规记录均带有对应的规则编号（如 `1.2 标题层级错误`）：

```python
    # 2. 基于正则匹配，将违规项按规则编号（如 1.1, 1.2）进行智能分组
    violation_groups = defaultdict(list)
    for v in violations:
        v_clean = v.replace('❌', '').strip()
        match = re.search(r'^\s*【?\s*(\d+\.\d+)', v_clean)
        if match:
            violation_groups[match.group(1)].append(v)
```

这段逻辑的执行流程可以拆解为三步：

1. **符号清洗**：首先通过 `v.replace('❌', '').strip()` 去除审查阶段可能夹带的 `❌` 醒目标记以及首尾空白，还原出干净的违规描述文本。
2. **编号提取**：利用正则表达式 `^\s*【?\s*(\d+\.\d+)` 从每条记录的开头捕获形如 `数字.数字` 的规则编号。该正则兼容了行首空白以及可选的中文书名号 `【` 前缀，确保在审查员输出格式存在细微差异时依然能稳定命中编号。
3. **同类归并**：借助 `defaultdict(list)`，系统将所有共享同一规则编号的违规项收拢到同一个列表键值下。例如所有 `2.2`（标点符号与列举冲突）的错误会被聚合为一组，所有 `1.2`（标题编号规范）的错误则聚合为另一组。

按规则分组使修复任务可以按维度独立派发，避免在单一 Prompt 中混合多种不相关规则导致注意力分散。

完成行号坐标系与规则分组后，数据被交付给多并发 Agent 执行局部替换。

### 5.2 局部替换与防塌陷

在完成违规项归类分组后，系统再次调用多并发架构，为每一组规则分配独立的修补 Agent，并以结构化输出来约束修改的行为：

```python
class LineReplacement(BaseModel):
    start_line: int = Field(description="需要修改的原文起始行号（包含）。")
    end_line: int = Field(description="需要修改的原文结束行号（包含）。")
    new_content: str = Field(description="用于替换该行号区间的全新文本。绝对不要包含行号前缀。")
    reason: str = Field(description="修改原因简述。")

class RevisePlan(BaseModel):
    replacements: list[LineReplacement]
```

该 Pydantic 模型定义将编辑操作收束为确定的行号区间、替换文本及修改原因。

#### 5.2.1 并发修补调度

延续第 4 节中“规划与执行分层”的分治思想，修改节点并不会将上一轮审查暴露出的所有违规项一次性抛给单个 LLM。相反，系统以 5.1 节中已经完成的 `violation_groups`（按规则编号 `1.1`, `1.2` 等聚合的违规字典）为调度单元，为每一组规则启动一个专职的修补子 Agent 并发处理：

```python
    # 为每个规则分组分发独立的修补 Agent
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(
                generate_revise_plan, rule_id, group_violations, numbered_draft
            ): rule_id
            for rule_id, group_violations in violation_groups.items()
        }
```

这种“一组规则一个 Agent”的隔离设计带来了双重收益。其一是**注意力聚焦**：每个子 Agent 的 Prompt 中只包含单一规则维度的违规描述，模型不必在标题编号、标点符号、反引号滥用等互不相关的问题间反复横跳，从而显著降低了因上下文杂糅而产生的幻觉概率。其二是**吞吐提速**：借助 `ThreadPoolExecutor`，数个规则分组的修补计划得以并行生成，将原本串行处理数十条违规项的漫长耗时压缩至单组处理的量级。

#### 5.2.2 局部修改约束

在提示词中显式约束修改作用域，要求仅填写出现违规的具体行号区间（`start_line` 至 `end_line`），禁止重写全文。这确保了修改操作局限在问题行，保留无关正文段落。

同时，在 `new_content` 字段格式描述中声明禁止包含行号前缀，避免带有 `0001:` 标记的导航前缀写入最终文档。

#### 5.2.3 倒序替换与跨 Agent 冲突检测算法

针对各并发 Agent 返回的 `RevisePlan` 替换指令，底层进行统一排序、重叠冲突检测与合并处理：

```python
    # 1. 汇总所有 Agent 的替换指令并按起始行倒序排列
    all_replacements = []
    for future in as_completed(futures):
        plan = future.result()
        all_replacements.extend(plan.replacements)

    all_replacements.sort(key=lambda x: x.start_line, reverse=True)

    # 2. 跨 Agent 修改重叠区间冲突检测与过滤
    valid_replacements = []
    last_start = float('inf')
    for rep in all_replacements:
        if rep.end_line < last_start:
            valid_replacements.append(rep)
            last_start = rep.start_line
        else:
            logger.info(f" ⚠️ 忽略冲突的替换：行 {rep.start_line}-{rep.end_line} ({rep.reason}) - 与其他 Agent 修改重叠")

    # 3. 倒序执行列表切片替换
    for rep in valid_replacements:
        start_idx = max(0, rep.start_line - 1)
        end_idx = min(len(draft_lines), rep.end_line)
        new_lines = rep.new_content.split('\n')
        draft_lines = draft_lines[:start_idx] + new_lines + draft_lines[end_idx:]
```

系统采用 **倒序替换与区间碰撞检测** 策略。首先按 `start_line` 降序排列，由于多 Agent 并发处理不同规则可能产生重叠行区间的修改指令，通过 `rep.end_line < last_start` 校验进行冲突过滤，优先保留排在前面的精准修改并忽略重叠区间；随后由文档尾部向头部执行列表切片替换。这种设计保证了前序替换不会改变未处理区间的物理行号索引，从算法层面防止了行号错位与文本坍塌。

#### 5.2.4 防塌陷收益

局部替换模式具备以下工程特征：

1. **正文完整性**：替换仅发生在明确指定的行区间内，未修改行不受生成影响。
2. **修改可追踪**：每次修改均记录起止行号与替换文本，便于调试与审计。
3. **收敛性保障**：配合审查回流机制，每轮仅修补特定违规项，使草稿稳定趋于合规。

系统通过多源并发初稿生成、基于规则 RAG 的规范审查，以及行号编目的局部替换修补，实现了自动化的闭环生成与校验。

### 5.3 违规惩罚、历史缓存与单模块熔断机制

为了防止修改节点在面对边缘情况时陷入无限死循环，或在同一错误上反复无效修补，系统在 `generic_review_node` 与 `DocState` 中设计了跨轮次的历史缓存惩罚与单模块熔断机制。

#### 5.3.1 跨轮次违规历史缓存 (violation_history_cache)

在每轮审查执行时，系统不仅对比当前规则，还会从 `DocState` 中提取 `violation_history_cache` 记录。当检测到某一具体违规问题在前一轮已提出但在本轮仍未修正时，系统会触发**重复违规惩罚逻辑**：

```python
    # 提取历史违规缓存，识别重复犯错项
    violation_cache = state.get("violation_history_cache", [])
    repeated_violations = []
    
    if violation_cache:
        for new_v in violations:
            for old_v in violation_cache:
                if old_v in new_v or new_v in old_v:
                    repeated_violations.append(new_v)
                    break
                    
    # 若存在重复违规，向后续修改 Agent 注入惩罚性警示 Prompt
    if repeated_violations:
        penalty_text = "\n".join([f"  - {v}" for v in repeated_violations])
        logger.info(f"  ⚠️ 检测到 {len(repeated_violations)} 项反复出现的违规问题，触发惩罚提示注入！")
```

被识别出的重复违规会被冠以 `【⚠️ 严重警告：在上一轮修改中已被提出但至今未纠正】` 前缀注入到修补 Prompt 中。这种惩罚机制强化了大模型对“屡教改不好”特定顽固问题的注意力分配，大幅提升了自愈修改的收敛效率。

#### 5.3.2 单模块重试次数上限与强制熔断 (MAX_ITERATIONS_PER_MODULE)

在 `DocState` 的 `iteration_counts` 字段中，系统以字典形式动态追踪每个排版模块独立被修补的次数。为防止某些模型极端幻觉或不可解的格式冲突导致图流程陷入死循环，审查节点设置了 `MAX_ITERATIONS_PER_MODULE = 3` 的熔断阈值：

```python
    # 检查当前模块的尝试次数是否超限
    iter_counts = state.get("iteration_counts", {})
    current_count = iter_counts.get(mod_key, 0)
    
    if current_count >= 3:
        logger.info(f"  ⚠️ 模块【{mod_name}】重试次数已达上限 ({current_count}/3)，触发安全熔断，强制放行推进！")
        return {
            "is_valid": True,  # 强制将状态置为 True
            "review_comments": [f"【熔断放行】模块 {mod_name} 重试 3 次仍存在部分残留问题，触发安全熔断推进。"],
            "iteration_counts": iter_counts
        }
```

当单个模块的自愈修复重试达到 3 次上限时，系统自动拦截该模块的否定判定，强制将 `is_valid` 置为 `True`，并向全局状态写入熔断放行日志。控制流随即沿链式路由推进至下一个排版模块或 `END` 节点。这一机制确保了整个状态机在面对极端异常输入时具备**$100\%$ 可完成的确定性保障**。

## 6. 系统全景与二次开发

本节对智能文档生成系统的架构进行全流程梳理，并提供二次开发与扩展指南。

### 6.1 全流程梳理

系统基于 LangGraph 编排与规则 RAG 检索构建闭环工程架构（展平节点拓扑可参见第 2.2.4 节）。整个流程可以归纳为三个连续的阶段：

1. **输入解析与归一化阶段**：系统启动后，根据 `DocState` 中的 `input_mode`（`text`, `notes`, `code`）由 `route_entry` 触发动态入口路由。无论输入是纯文本说明、Markdown 笔记还是代码库物理路径，系统均通过专用节点将其清洗并归一化为统一的 `context` 变量。
2. **初稿规划与并发撰写阶段**：在 `generate_draft` 节点中，系统首先调用 `LlmClient.generate_structured` 生成符合 MECE 原则的章节大纲 `Outline`（落盘至 `outline.json`），随后按章节规模分配并发线程池 (`dynamic_workers`) 驱动子 Agent 独立撰写章节正文（落盘至 `section_{i}.md`），并在合成初稿后将后续模块推入审查队列。
3. **展平审查与局部自愈阶段**：控制流依次流经展平注册的规则审查节点（如 `review_metadata_and_structure`）。节点调用 `RuleRepository` 从 `./rules_db` 向量库检索刚性规则条文。若草稿未通过校验，闭包路由判定指向对应修补节点（如 `revise_metadata_and_structure`）。修补节点建立 4 位行号坐标系并按规则编号分组，并发生成 `LineReplacement` 行号区间替换指令。每次修补完成后同步更新 WIP 中间稿（`draft_wip.md`），并通过闭环反向边流回审查节点复查，结合单模块上限 3 次的安全熔断机制，直至全部模块通关到达 `END`。

### 6.2 二次开发与集成指南

基于模块化的 LangGraph 架构与接缝设计，开发者可围绕以下四个工程方向进行扩展与定制：

1. **Agent Skill 工具化集成 (`src/agent/export.py`)**：系统通过 LangChain `@tool` 装饰器将整个文档生成状态图导出为可执行工具 `generate_docs_skill`：
   ```python
   @tool
   def generate_docs_skill(topic: str, source_path: str = ".") -> str:
       """自动扫描项目代码，并基于代码内容生成符合排版规范的专业技术文档。"""
       result = graph.invoke({"topic": topic, "source_path": source_path})
       return result.get("current_draft", "Failed to generate document.")
   ```
   外部 Agent 或 LLM 框架可直接加载此接缝工具，实现“代码探索-文档生成-自愈排版”全流程能力的无缝嵌入。
2. **拓展规则库与双 Chroma DB 机制**：
   - **规则数据库 (`ingest_rules.py`)**：解析 `DOC_GUIDELINES.md`，使用 `MarkdownHeaderTextSplitter` 与“所属章节”前缀注入构建 `rules_db` 向量库。修改排版规范后运行 `python -m src.agent.ingest_rules` 即可完成规则升级。
   - **通用知识数据库 (`ingest_docs.py`)**：使用 `RecursiveCharacterTextSplitter`（`chunk_size=500, chunk_overlap=50`）构建 `chroma_db` 向量库，用于通用领域知识检索。
3. **自定义节点与图编排扩展**：开发者可在 `src/agent/nodes.py` 中添加自定义处理节点，在 `DocState` 中扩展上下文字段，并在 `graph.py` 中通过 `add_node` 与条件边编排新逻辑。
4. **模型路由与环境配置**：系统在 `.env` 中读取 `ARK_BASE_URL` 与 `ARK_API_KEY` 及 `MODEL_ID`。在 `llm_client.py` 中扩展模型路由映射时，需确保正确配置厂商特定参数（如 `ChatNVIDIA` 的 `enable_thinking` 深度思考开关与 `ChatAnthropic` 的自定义 base URL）。


---


## 参考文档

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Chroma DB Documentation](https://docs.trychroma.com/)


