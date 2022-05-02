
const axios = require("axios");
const request = axios.create({
    timeout: 10*1000, // 请求超时时间
    baseURL: `http://127.0.0.1:9090`,
})

//重载配置文件
module.exports.setConfigs=async (path)=>{
  return  request.put("/configs",{path})
}
//获取配置
module.exports.getConfigs=async ()=>{
 return  request.get("/configs")
}
//获取所有的节点
module.exports.getProxies=async ()=>{
    return  request.get("/proxies")
}

//获取单个节点延迟
//name节点名称
//timeout超时时间
//url测试的网址
module.exports.getDelay=async (name,timeout,url="http://www.gstatic.com/generate_204")=>{
    return  request.get(`/proxies/${encodeURIComponent(name)}/delay?timeout=${timeout}&url=${encodeURIComponent(url)}`)
}

//设置当前选择的节点
//groups 分组
//name 节点名
module.exports.setSelector=async (groups,name)=>{
    return  request.put(`/proxies/${encodeURIComponent(groups)}`,{name})
}

