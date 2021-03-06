module.exports = {
  purge: {
    enabled: true,
    content: ["./src/**/*.html", "./src/**/*.jsx", "./src/**/*.tsx"],
  },
  theme: {
    extend: {},
    maxHeight: {
      "64": "16rem",
    },
    fontFamily: {
      gibbon: ["Inconsolata", "Monaco", "Consolas", "Courier New", "Courier"],
    },
  },
  variants: {},
  plugins: [],
};
