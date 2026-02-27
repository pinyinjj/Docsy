# Gemini Context: Docsy Hugo Project (Zed)

This project is a Hugo-based documentation and blog site titled **Zed**, built using the **Docsy** theme as a Hugo module. It supports multi-language content (primarily Chinese and English) and utilizes PostCSS for styling.

## Project Overview
- **Purpose**: A personal technical blog and documentation site ("Zed").
- **Main Technologies**:
  - **Hugo (Extended)**: Static site generator (requires version 0.146.0 or higher).
  - **Go**: Used for Hugo modules and workspace management.
  - **Node.js**: Manages frontend dependencies like PostCSS, Autoprefixer, and Sass.
  - **Docsy**: A high-performance Hugo theme for documentation.
  - **Docker**: Provides a containerized development environment.
- **Architecture**:
  - Content is organized by language in `content/cn` (default) and `content/en`.
  - Custom styles and assets are located in `assets/scss` and `static/`.
  - Custom layouts and partials are in `layouts/`.
  - Site configuration is managed in `hugo.yaml`.

## Building and Running

### Prerequisites
- **Hugo Extended**: `v0.146.0+`
- **Go**: `v1.18+`
- **Node.js**: For PostCSS and SCSS processing.

### Key Commands
- **Development Server**:
  ```bash
  npm run serve
  # or
  hugo server
  ```
- **Production Build**:
  ```bash
  npm run build
  # or
  hugo --minify
  ```
- **Local Theme Development**:
  To use a local clone of the Docsy theme for development:
  ```bash
  HUGO_MODULE_WORKSPACE=docsy.work hugo server
  ```
- **Docker**:
  ```bash
  docker-compose up --build
  ```

## Development Conventions

### Content Management
- **Languages**: 
  - Chinese (Default): `content/cn/`
  - English: `content/en/`
- **Blog Posts**: Located in `content/cn/blog/` or `content/en/blog/`. Permalinks follow the pattern `/:section/:month/:day/:year/:slug/`.
- **Images**: Store images in `static/images/` and reference them in Markdown using absolute paths or relative to the static root.

### Styling and Layouts
- **Sass/SCSS**: Custom variables should be added to `assets/scss/_variables_project.scss`.
- **Layouts**: Use `layouts/partials/` for reusable components and `layouts/blog/` for blog-specific templates.
- **PostCSS**: Used for autoprefixing and RTL support (via `rtlcss`).

### Configuration
- **Site Config**: `hugo.yaml` contains all major settings, including menu links, social icons, and theme parameters.
- **Dependencies**: `package.json` manages Node.js tools, while `go.mod` manages Hugo modules.

## Key Files
- `hugo.yaml`: The primary configuration file for the site.
- `package.json`: Defines build scripts and frontend dependencies.
- `go.mod`: Defines Hugo module imports (e.g., Docsy theme).
- `netlify.toml`: Configuration for Netlify deployment.
- `docsy.work`: Hugo workspace file for local theme development.

## Agent Rules
- **git**: Never use git command automaticlly if user not ask.
- **Consistensy**: Always reuse exists widgets or styles in project.
- **Minium Fix**: Only code what user asked, if agent have better potential idea, ask user for approve, provide plan details.
