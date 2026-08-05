const httpsCheck = require("../services/httpscheck.js");
const ippatterncheck = require("../services/ipPatterncheck.js");
const resultVerdict = require("../utils/getVerdict.js")

function urlScoreCheck(url){

const httpsResult = httpsCheck(url);
const ippatternresult = ippatterncheck(url);
const score = 100 + httpsResult.points + ippatternresult.points;

const reasons=[];
if (!httpsResult.passed){
    reasons.push(httpsResult.reasons)
}

if (!ippatternresult.passed){
    reasons.push(ippatternresult.reasons)
}

const verdict= resultVerdict(score)

return {
    score, reasons, verdict
}

}


module.exports = urlScoreCheck;

