// src/app/login/page.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginPlain() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontSize:24}}>
      Login is alive ✅
    </div>
  );
}
