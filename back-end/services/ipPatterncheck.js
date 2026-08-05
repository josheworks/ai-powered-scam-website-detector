const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/; 
function checkippattern(url) {
  if (ipPattern.test(url)) {
    return {
      passed: false,
      points: -40,
      reasons: "This URL contains IP Address instead of DNS",
    };
  } else {
    return {
      passed: true,
      points: 0,
      reasons: null,
    };
  }
}

module.exports = checkippattern;

