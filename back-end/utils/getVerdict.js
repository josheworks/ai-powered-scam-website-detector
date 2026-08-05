
function getVerdict(score){
    if(score>=81){
        return "Safe"
    }else if(score >=40){
        return "Suspicious"
    }else {
        return "Dangerous"
    }
}

module.exports= getVerdict;

