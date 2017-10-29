const defaultOptions = {
    timeout:5000,
    jsonpCallback:'callback',//url问号后面的key
    jsonpCallbackFunction:null,//jsonpCallback的value
}

function generateCallbackFunction(){
    return `jsonp_${Date.now()}_${Math.ceil(Math.random()*100000)}`;
    // 生成jsonpCallbackFunction的名字,(jsonp_创建时的时间戳_随机数)保证函数名不重复
}

function clearFunction(functionName){
    try{
        delete window[functionName];//在window属性里面里找functionName,并且把它删除
    }catch(e){
        window[functionName] = undefined;
    }
}

function removeScript(scriptId){
    const script = document.getElementById(scriptId);
    if(script){
        document.getElementsByTagName('head')[0].removeChild(scriptId)
        //如果找到了scriptId这个id,那么就把它从head里删除
    }
}

function fetchJsonp(_url,option={}){
    let url=_url;//传入要获取数据的url
    const timeout = options.timeout || defaultOptions.timeout;
    //看一下options里面是不是有timeout,如果没有,就用默认的
    const jsonpCallback = options.jsonpCallback || defaultOptions.jsonpCallback;
    //看一下options里面是不是有jsonpCallback,如果没有,就用默认的

    let timeoutId;

    return new Promise((resolve,reject) => {
        const callbackFunction = options.jsonpCallbackFunction || generateCallbackFunction();
        //看一下参数里面有没有人给这个新函数定义名字,如果没有,那么就用generateCallbackFunction()生成一个函数名字
        const scriptId = `${jsonpCallback}_${callbackFunction}`;
        //定义一个scriptId,定义规范是key_value
        window[callbackFunction] = (response) =>{
            //往window里面注册一个callbackFuntion,并且这个函数还没有开始调用
            resolve({
                ok:true,
                json:() => Promise.resolve(response),
                //返回一个Promise对象,resolve()一下
            })

            if(timeoutId){
                clearTimeout(timeoutId);
                //平衡机制,如果resolve成功,那么就趁timeoutId还没有把自己清除之前把timeoutId就给清除了

            removeScript(scriptId);

            clearFunction(callbackFunction);
        }

        url+=(url.indexOf('?') === -1) ? '?' : '&';
        //看url里面有没有问号,如果没有的话说明还没有加入参数,
        //那么就添加一个问号,如果已经加入了参数了,也就是说这个参数已经是第二或者第三个参数,那么就需要添加&来连接
        const jsonpScript = document.createElement('script');
        //开始创建一个jsonpScript,后面是配置与使用
        jsonpScript.setAttribute('src',`${url}${jsonpCallback}=${callbackFunction}`);
        if(options.charset){
            jsonpScript.setAttribute('charset',options.charset);
            //如果options里面有给script设置编码的话,就给script设置编码
        }
        jsonpScript.id=scriptId;//给这个jsonpScript设置了一个id,方便以后删除用
        document.getElementsByTagName('head')[0].appendChild(jsonpScript);

        timeoutId = setTimeout(() => {
            reject(new Error(`JSONP request to ${_url} timed out`));
            //请求被拒绝之后就抛出一个错误
            clearFunction(callbackFunction);
            //如果这个函数没有用,那么不如删除这函数名,别占着茅坑不拉屎
            removeScript(scriptId);//同理,把script标签也删除了
            window[callbackFunction] = () =>{
                clearFunction(callbackFunction);
                //这个时候response没有收到,本来的window.callbackFunction这个方法就修改为清除name,进行进一步的清除
            };
        },timeout);//平衡机制,如果五秒之后请求还是没有得到相应,那么我们就选择清除掉函数.

        jsonpScript.onerror = () =>{
            reject(new Error(`JSONP request to ${_url} failed}`));

            clearFunction(callbackFunction);
            removeScript(scriptId);
            if(timeoutId) clearTimeout(timeoutId);
        }
    })
}

export default fetchJsonp;//暴露这个接口

//此代码最为精妙的地方就在于reject给时间给promise来resolve,如果不成功就reject.