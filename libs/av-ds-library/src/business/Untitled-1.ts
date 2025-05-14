

let array :Array<numbers> = [19,8,0,1,2,0,1,2]; 

let resultArray ={}; 

function sortArray(array,unique=1){
    array.forEach((number)=>{

        if(resultArray[number] == undefined){
            resultArray[number] = 1
        }
    
        if( resultArray[number]){
            resultArray[number] = resultArray[number]++;
        }
    })

    if(unique){ return  Object.keys(resultArray) }
     let resArray=[];
    Object.keys(resultArray).forEach( (number)=>{
        if(resultArray[number] > 1) {
            for(let i=0;i< resultArray[number].length;i++){
                resArray.push(resultArray[number])
            }
        }
        else 
        { resArray.push(resultArray[number])}
    })
    return  resArray=[];

}
