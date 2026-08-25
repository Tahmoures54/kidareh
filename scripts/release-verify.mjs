import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const required = ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", ".env.example"];
const failures = [];
for (const file of required) if (!fs.existsSync(path.join(root,file))) failures.push(`Missing ${file}`);
const pkg = JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
for (const name of ["typecheck","lint","test","build"]) if (!pkg.scripts[name]) failures.push(`Missing npm script: ${name}`);
if (pkg.version !== "1.2.0") failures.push(`Unexpected version: ${pkg.version}`);
const env = fs.readFileSync(path.join(root,".env.example"),"utf8");
for (const key of ["JWT_SECRET","COOKIE_SECRET","DATABASE_URL","APP_URL","ADMIN_PHONE"]) if (!new RegExp(`^${key}=`,"m").test(env)) failures.push(`Missing env example: ${key}`);
const sourceFiles = [];
for (const dir of ["src", "server"]) {
  const walk = (d) => { for (const entry of fs.readdirSync(path.join(root,d), {withFileTypes:true})) { const rel=path.join(d,entry.name); if(entry.isDirectory()) walk(rel); else if(/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(rel); } };
  walk(dir);
}
for (const file of sourceFiles) {
  const text=fs.readFileSync(path.join(root,file),"utf8");
  if (/Authorization\s*[:=].*Bearer|localStorage\.(getItem|setItem)\(.*(?:token|refresh)/i.test(text) && !file.endsWith("security.ts") && !file.endsWith("authHelpers.ts")) failures.push(`Legacy browser credential pattern in ${file}`);
}
const run = (cmd,args) => { console.log(`\n$ ${cmd} ${args.join(" ")}`); const r=spawnSync(cmd,args,{stdio:"inherit",shell:process.platform==="win32"}); if(r.status!==0) failures.push(`${cmd} ${args.join(" ")} failed`); };
run(process.platform==="win32"?"npm.cmd":"npm",["run","typecheck"]);
run(process.platform==="win32"?"npm.cmd":"npm",["run","lint"]);
run(process.platform==="win32"?"npm.cmd":"npm",["run","test"]);
run(process.platform==="win32"?"npm.cmd":"npm",["run","build"]);
if (failures.length) { console.error("\nRELEASE VERIFY FAILED:"); failures.forEach(x=>console.error(`- ${x}`)); process.exit(1); }
console.log("\nRELEASE VERIFY PASSED");
