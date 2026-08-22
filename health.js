module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({ok:true,service:'Salt Swap scanner',version:'1.3.5',time:new Date().toISOString()});
};
