export const dogCourses=['Hove','Monmore','Newcastle','Nottingham','Romford','Sheffield','Sunderland','Towcester'];
export const defaultCourses=['Aintree','Ascot','Cheltenham','Chester','Doncaster','Epsom','Goodwood','Haydock','Kempton','Newbury','Newmarket','Sandown','York'];
export function randomIndex(size,random=crypto){if(!Number.isInteger(size)||size<1||size>10000)throw Error('No races are available.');const ceiling=2**32-(2**32%size);let sample;do{sample=random.getRandomValues(new Uint32Array(1))[0];}while(sample>=ceiling);return sample%size;}
export function chooseRace(races,played,random=crypto){if(!races.length)throw Error('Add race footage to this course first.');const remaining=races.filter(r=>!played.has(r.id));if(!remaining.length)throw Error('All races at this course have been played. Reset this course to start again.');return remaining[randomIndex(remaining.length,random)];}
export function videoFile(file){return /\.(mp4|webm|ogv|m4v|mov)$/i.test(file.name)&&file.size>0&&file.size<=750*1024*1024;}
export function clock(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';return Math.floor(seconds/60)+':'+String(Math.floor(seconds)%60).padStart(2,'0');}
export function validMessage(message,session){return message&&message.session===session&&['hello','ready','load','control','status','close'].includes(message.type);}
