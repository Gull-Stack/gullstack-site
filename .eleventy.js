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
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("*.png");
  eleventyConfig.addPassthroughCopy("*.ico");
  eleventyConfig.addPassthroughCopy("*.jpg");
  eleventyConfig.addPassthroughCopy("*.svg");
  eleventyConfig.addPassthroughCopy("fly");
  eleventyConfig.addPassthroughCopy("contract");
  eleventyConfig.addPassthroughCopy("projects");
  eleventyConfig.addPassthroughCopy("pitch");
  eleventyConfig.addPassthroughCopy("pitch/**/*.{jpg,jpeg,png,gif,svg,webp,ico}");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("supertool");
  eleventyConfig.addPassthroughCopy("images");

  // Static HTML pages (passed through as-is)
  eleventyConfig.addPassthroughCopy("privacy.html");
  eleventyConfig.addPassthroughCopy("terms.html");
  eleventyConfig.addPassthroughCopy("sales-agent-blueprint.html");
  eleventyConfig.addPassthroughCopy("sunwest-sponsorship.html");

  // Pass through remaining blog HTML files (legacy, not yet converted)
  eleventyConfig.addPassthroughCopy("blog/is-blogging-really-worth-it.html");
  eleventyConfig.addPassthroughCopy("blog/marketing-starts-telling-story.html");
  eleventyConfig.addPassthroughCopy("blog/you-should-write-your-own-content.html");
  eleventyConfig.addPassthroughCopy("blog/professional-photography-game-changing.html");
  eleventyConfig.addPassthroughCopy("blog/so-we-created-a-fake-business.html");
  eleventyConfig.addPassthroughCopy("blog/you-should-really-own-your-own-domain.html");

  // Pass through blog images
  eleventyConfig.addPassthroughCopy("blog/**/*.{jpg,jpeg,png,gif,svg,webp}");

  // API routes
  eleventyConfig.addPassthroughCopy("api");

  // Brand facts for AI/AEO
  eleventyConfig.addPassthroughCopy(".well-known");

  // Date filter for sitemap
  eleventyConfig.addFilter("date", function(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
