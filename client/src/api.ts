const API=import.meta.env.VITE_API_URL??'http://localhost:3001/api';
export type Session={accessToken:string;refreshToken:string;user:{id:string;name:string;email:string;role:'ADMIN'|'WORKER'}};
let session:Session|null=JSON.parse(localStorage.getItem('fieldsync.session')??'null');
export const getSession=()=>session;
export const setSession=(s:Session|null)=>{session=s;if(s)localStorage.setItem('fieldsync.session',JSON.stringify(s));else localStorage.removeItem('fieldsync.session')};
async function refresh(){if(!session)throw new Error('Login required');const r=await fetch(`${API}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.refreshToken})});if(!r.ok){setSession(null);throw new Error('Session expired; log in again')}const data=await r.json();setSession({...session,...data});return data.accessToken}
export async function api<T=any>(path:string,options:RequestInit={},retry=true):Promise<T>{const headers=new Headers(options.headers);headers.set('Content-Type','application/json');if(session)headers.set('Authorization',`Bearer ${session.accessToken}`);let response=await fetch(`${API}${path}`,{...options,headers});if(response.status===401&&session&&retry){const token=await refresh();headers.set('Authorization',`Bearer ${token}`);response=await fetch(`${API}${path}`,{...options,headers})}const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error?.message??`Request failed (${response.status})`);return data}
export const apiUrl=API;
