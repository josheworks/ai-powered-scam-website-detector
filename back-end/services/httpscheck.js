function checkHttps(url) {
  if (url.startsWith("https://")) {
    return {
      passed: true,
      points: 0,
      reasons: null,
    };
  } else {
    return {
      passed: false,
      points: -20,
      reasons: "URL does not use HTTPS",
    };
  }
}

module.exports = checkHttps;

