exports.handler = async function(event, context) {
  // 允许的 HTTP 方法
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  
  // 处理预检请求 (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // 获取目标 URL
  const { url } = event.queryStringParameters || {};
  
  if (!url) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Missing URL parameter. Use ?url=YOUR_TARGET_URL',
        example: 'https://your-site.netlify.app/.netlify/functions/cors-proxy?url=https://api.example.com/data'
      })
    };
  }

  try {
    // 验证 URL 格式
    const urlObj = new URL(url);
    
    // 构建请求选项
    const requestOptions = {
      method: event.httpMethod,
      headers: {
        'User-Agent': 'Netlify-CORS-Proxy/1.0'
      }
    };

    // 如果有请求体，添加到选项中
    if (event.body && event.httpMethod !== 'GET') {
      requestOptions.body = event.body;
      requestOptions.headers['Content-Type'] = event.headers['content-type'] || 'application/json';
    }

    // 发送请求到目标 URL
    const response = await fetch(url, requestOptions);
    
    // 获取响应内容
    const contentType = response.headers.get('content-type') || 'text/plain';
    const data = await response.text();

    // 返回响应
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300' // 5分钟缓存
      },
      body: data
    };

  } catch (error) {
    console.error('CORS Proxy Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch the requested URL',
        details: error.message 
      })
    };
  }
}; 