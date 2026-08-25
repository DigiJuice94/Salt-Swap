export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  return res.status(410).json({
    ok:false,
    legacy:true,
    version:'1.11.13',
    message:'Legacy health.js is disabled. Production health is /api/health -> api.mjs.'
  });
}
