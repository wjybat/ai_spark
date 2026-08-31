function MarkdownContent({ content = "", inline = false, className = "" }) {
  const html = React.useMemo(() => {
    if (!window.AtlasMarkdown) return null;
    return window.AtlasMarkdown.renderMarkdown(content, inline);
  }, [content, inline]);
  const Tag = inline ? "span" : "div";
  const classes = `markdown-content ${inline ? "markdown-inline" : ""} ${className}`.trim();
  // If the local bundle fails to load, preserve readable source instead of throwing or injecting raw HTML.
  if (html === null) return <Tag className={classes}>{String(content ?? "")}</Tag>;
  return <Tag className={classes} dangerouslySetInnerHTML={{ __html: html }}></Tag>;
}

Object.assign(window, { MarkdownContent });
