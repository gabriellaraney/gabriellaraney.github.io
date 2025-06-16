module.exports = function(eleventyConfig) {
	return {
	  dir: {
	    input: "src",
		includes: "_includes",
	    output: "docs"
	  },
	  markdownTemplateEngine: "njk",
	  htmlTemplateEngine: "njk",
	  dataTemplateEngine: "njk"
	};
};