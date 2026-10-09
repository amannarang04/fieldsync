import React from 'react';
import { Check, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Button({variant='primary',className='',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'danger'}){return <button className={`btn ${variant==='primary'?'':variant} ${className}`} {...props}/>}
export function Card({className='',...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={`card ${className}`} {...props}/>}
export function Badge({tone='neutral',children}:{tone?:'neutral'|'success'|'warning'|'danger'|'info';children:React.ReactNode}){return <span className={`ui-badge ${tone}`}>{children}</span>}
export function Input(props:React.InputHTMLAttributes<HTMLInputElement>){return <input {...props}/>}
export function Select(props:React.SelectHTMLAttributes<HTMLSelectElement>){return <select {...props}/>}
export function Modal({open,title,children,onClose}:{open:boolean;title:string;children:React.ReactNode;onClose:()=>void}){if(!open)return null;return <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={17}/></button></header>{children}</section></div>}
export function Toast({children,tone='success'}:{children:React.ReactNode;tone?:'success'|'error'|'info'}){const Icon=tone==='success'?Check:Info;return <div className={`toast ${tone}`} role="status"><Icon size={16}/>{children}</div>}
export function Skeleton({className=''}:{className?:string}){return <div className={`skeleton ${className}`} aria-hidden="true"/>}
export function EmptyState({title,description,icon:Icon=Info,action}:{title:string;description:string;icon?:LucideIcon;action?:React.ReactNode}){return <div className="empty-state"><span className="empty-icon"><Icon size={22}/></span><h3>{title}</h3><p>{description}</p>{action}</div>}
export function StatCard({label,value,icon:Icon=Info,detail}:{label:string;value:React.ReactNode;icon?:LucideIcon;detail?:string}){return <Card className="stat-card"><span className="stat-icon"><Icon size={18}/></span><span className="muted">{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</Card>}
export function Tabs({items,active,onChange}:{items:{label:string;icon?:React.ReactNode}[];active:string;onChange:(label:string)=>void}){return <div className="ui-tabs" role="tablist">{items.map(item=><button key={item.label} role="tab" aria-selected={active===item.label} className={active===item.label?'active':''} onClick={()=>onChange(item.label)}>{item.icon}{item.label}</button>)}</div>}
export function Table({children}:{children:React.ReactNode}){return <div className="table-wrap"><table>{children}</table></div>}
