import { describe, it, expect } from 'vitest';
import { isFieldVisible, validateAnswers, retryDelay, type Field } from './index.js';
const fields: Field[] = [{id:'ok',label:'Consent',type:'single_choice',required:true,options:['Yes','No']},{id:'age',label:'Age',type:'number',required:true,min:18,max:100,condition:{fieldId:'ok',equals:'Yes'}}];
describe('shared validation',()=>{
 it('evaluates conditional visibility',()=>{expect(isFieldVisible(fields[1],{ok:'Yes'})).toBe(true);expect(isFieldVisible(fields[1],{ok:'No'})).toBe(false)});
 it('validates visible required/range fields',()=>{expect(validateAnswers(fields,{ok:'Yes',age:10})).toContain('Age must be at least 18');expect(validateAnswers(fields,{ok:'No'})).toEqual([])});
 it('requires at least one selection for a required multiple-choice field',()=>{expect(validateAnswers([{id:'checks',label:'Checks',type:'multiple_choice',required:true,options:['A','B']}],{checks:[]})).toContain('Checks is required')});
 it('backs off and caps retries',()=>{expect(retryDelay(3,100)).toBe(800);expect(retryDelay(20,100,500)).toBe(500)});
});
