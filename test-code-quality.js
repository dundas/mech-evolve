// Test file to see if code-quality-guardian agent responds
function poorlyWrittenFunction(x,y,z) {
    var result;
    if(x>0){
        if(y>0){
            if(z>0){
                result=x+y+z;
            }else{
                result=x+y;
            }
        }else{
            result=x;
        }
    }else{
        result=0;
    }
    return result;
}

// Missing semicolon here
var unused_variable = "this should trigger linting issues"

console.log(poorlyWrittenFunction(1,2,3))