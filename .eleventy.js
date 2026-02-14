module.exports = function(eleventyConfig) {
  // Ignore old HTML files that have been converted to njk
  eleventyConfig.ignores.add("index.html");
  eleventyConfig.ignores.add("blog/index.html");
  eleventyConfig.ignores.add("blog/gold-wash-plants-case-study.html");
  
  // Ignore markdown files (not content)
  eleventyConfig.ignores.add("*.md");
  eleventyConfig.ignores.add("PLAYBOOK.md");
  eleventyConfig.ignores.add("README.md");
  
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("*.png");
  eleventyConfig.addPassthroughCopy("*.ico");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("*.svg");
  eleventyConfig.addPassthroughCopy("fly");
  eleventyConfig.addPassthroughCopy("contract");
  eleventyConfig.addPassthroughCopy("projects");
  eleventyConfig.addPassthroughCopy("ai-consulting");
  eleventyConfig.addPassthroughCopy("pitch"); // Keep pitch pages as-is (standalone client pitches)
  eleventyConfig.addPassthroughCopy("privacy.html"); // Static for now
  
  // Pass through remaining blog HTML files (not yet converted)
  // Explicitly list files NOT yet converted to njk
  eleventyConfig.addPassthroughCopy("blog/is-blogging-really-worth-it.html");
  eleventyConfig.addPassthroughCopy("blog/marketing-starts-telling-story.html");
  eleventyConfig.addPassthroughCopy("blog/you-should-write-your-own-content.html");
  eleventyConfig.addPassthroughCopy("blog/professional-photography-game-changing.html");
  eleventyConfig.addPassthroughCopy("blog/so-we-created-a-fake-business.html");
  eleventyConfig.addPassthroughCopy("blog/you-should-really-own-your-own-domain.html");
  
  // Pass through blog images
  eleventyConfig.addPassthroughCopy("blog/**/*.{jpg,jpeg,png,gif,svg,webp}");
  
  // Keep URLs clean (no trailing slash, no .html)
  // This matches vercel.json cleanUrls: true
  
  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    // Template formats to process
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
