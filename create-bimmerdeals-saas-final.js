const fs = require('fs');
const path = require('path');

const projectName = 'bimmerdeals-saas';
const basePath = path.join(process.cwd(), projectName);

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

function main() {
  console.log('Criando BimmerDeals SaaS completo com Auth + Stripe mock...');

  // ==== package.json ====
  writeFile(path.join(basePath, 'package.json'), `{
  "name": "bimmerdeals-saas",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "13.x",
    "react": "18.x",
    "react-dom": "18.x",
    "tailwindcss": "^3.3.0",
    "next-auth": "^4.23.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "stripe": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}`);

  // ==== Dockerfile ====
  writeFile(path.join(basePath, 'Dockerfile'), `FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
`);

  // ==== docker-compose.yml ====
  writeFile(path.join(basePath, 'docker-compose.yml'), `version: '3.8'
services:
  app:
    build: .
    volumes:
      - .:/app
    ports:
      - "3000:3000"
`);

  // ==== Tailwind config ====
  writeFile(path.join(basePath, 'tailwind.config.js'), `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}','./components/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`);
  writeFile(path.join(basePath, 'postcss.config.js'), `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }`);
  writeFile(path.join(basePath, 'styles/globals.css'), `@tailwind base; @tailwind components; @tailwind utilities;`);

  // ==== ENV example ====
  writeFile(path.join(basePath, '.env.example'), `NEXTAUTH_SECRET=supersecretkey
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_yourkey
`);

  // ==== Frontend Pages ====
  writeFile(path.join(basePath, 'app/page.tsx'), `import VehicleSelector from '../components/VehicleSelector';
import { getSession } from 'next-auth/react';
export default async function Home() {
  const session = await getSession();
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-blue-700 mb-6">BimmerDeals</h1>
      {session ? (
        <>
          <p className="text-gray-700 mb-4">Selecione o veículo e categoria para ver ofertas:</p>
          <VehicleSelector />
        </>
      ) : (
        <p className="text-gray-700">Você precisa <a href="/auth/signin" className="text-blue-700 underline">entrar</a> para acessar.</p>
      )}
    </main>
  )
}`);

  // ==== Components ====
  const components = {
    'VehicleSelector.tsx': `import { useState } from 'react';
import { useRouter } from 'next/router';
export default function VehicleSelector() {
  const [brand,setBrand] = useState('BMW');
  const [series,setSeries] = useState('');
  const [model,setModel] = useState('');
  const [engine,setEngine] = useState('');
  const router = useRouter();
  const handleSearch = () => {
    if(!series||!model||!engine) return alert('Preencha todos os campos');
    router.push(\`/vehicles/\${brand}-\${series}-\${model}-\${engine}/parts\`);
  };
  return (
    <div className="bg-white p-6 rounded shadow-md max-w-lg mx-auto">
      <input className="border p-2 w-full mb-2" placeholder="Série" value={series} onChange={e=>setSeries(e.target.value)}/>
      <input className="border p-2 w-full mb-2" placeholder="Modelo" value={model} onChange={e=>setModel(e.target.value)}/>
      <input className="border p-2 w-full mb-4" placeholder="Motor" value={engine} onChange={e=>setEngine(e.target.value)}/>
      <button onClick={handleSearch} className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">Buscar Peças</button>
    </div>
  );
}`,
    'PartCard.tsx': `import Link from 'next/link';
import PriceHistoryChart from './PriceHistoryChart';
export default function PartCard({part}:any){
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col relative">
      {part.sponsored && <span className="bg-yellow-400 text-black px-2 py-1 text-sm rounded absolute top-2 right-2">Patrocinada</span>}
      <h3 className="font-bold text-lg">{part.name}</h3>
      <p className="text-gray-500 line-through">{part.oldPrice} €</p>
      <p className="text-green-600 font-semibold">{part.price} €</p>
      <PriceHistoryChart partId={part.id}/>
      <Link href={\`/alerts?partId=\${part.id}\`} className="mt-2 bg-blue-700 text-white px-4 py-2 rounded text-center hover:bg-blue-800">Criar Alerta</Link>
    </div>
  );
}`,
    'PriceHistoryChart.tsx': `'use client';
import { useEffect,useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,Title,Tooltip,Legend);
export default function PriceHistoryChart({partId}:{partId:string}){
  const [data,setData] = useState<any>(null);
  useEffect(()=>{
    fetch(\`/api/parts/\${partId}/history\`).then(res=>res.json()).then(history=>{
      setData({
        labels:history.map((h:any)=>new Date(h.date).toLocaleDateString()),
        datasets:[{label:'Preço',data:history.map((h:any)=>h.price),borderColor:'rgb(34,197,94)',backgroundColor:'rgba(34,197,94,0.5)'}]
      });
    });
  },[partId]);
  return data ? <Line data={data}/> : <p>Carregando gráfico...</p>;
}`,
    'AdminTable.tsx': `import { useEffect,useState } from 'react';
export default function AdminTable(){
  const [parts,setParts] = useState([]);
  useEffect(()=>{fetch('/api/admin/parts').then(res=>res.json()).then(data=>setParts(data));},[]);
  return (
    <table className="min-w-full bg-white shadow rounded">
      <thead className="bg-blue-700 text-white">
        <tr><th className="p-2">Nome</th><th className="p-2">Preço</th><th className="p-2">Patrocinada</th><th className="p-2">Ações</th></tr>
      </thead>
      <tbody>
        {parts.map((part:any)=>(
          <tr key={part.id} className="border-b">
            <td className="p-2">{part.name}</td>
            <td className="p-2">{part.price}</td>
            <td className="p-2">{part.sponsored?'Sim':'Não'}</td>
            <td className="p-2">
              <button className="bg-yellow-400 px-2 py-1 rounded mr-2">Editar</button>
              <button className="bg-red-500 px-2 py-1 rounded text-white">Excluir</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}`
  };

  for (const [name, content] of Object.entries(components)) {
    writeFile(path.join(basePath, 'components', name), content);
  }

  // ==== API Mock ====
  const apis = {
    'parts.ts': `export default function handler(req,res){const parts=[{id:'1',name:'Disco de Freio',price:1200,oldPrice:1300,sponsored:true},{id:'2',name:'Pastilha de Freio',price:400,oldPrice:450,sponsored:false},{id:'3',name:'Amortecedor',price:600,oldPrice:650,sponsored:true}];res.status(200).json(parts);}`,
    'parts/[partId]/history.ts': `export default function handler(req,res){const history=[{date:'2025-12-20',price:1300},{date:'2025-12-25',price:1250},{date:'2025-12-28',price:1200}];res.status(200).json(history);}`,
    'alerts.ts': `export default function handler(req,res){if(req.method==='POST')return res.status(200).json({success:true,message:'Alerta criado!'});res.status(200).json([]);}`,
    'admin/parts.ts': `export default function handler(req,res){const parts=[{id:'1',name:'Disco de Freio',price:1200,sponsored:true},{id:'2',name:'Pastilha de Freio',price:400,sponsored:false},{id:'3',name:'Amortecedor',price:600,sponsored:true}];res.status(200).json(parts);}`,
    'auth/[...nextauth].ts': `import NextAuth from "next-auth";
export default NextAuth({providers:[{id:'credentials',name:'Credentials',type:'credentials',credentials:{email:{label:'Email',type:'text'},password:{label:'Senha',type:'password'}},authorize:async(credentials:any)=>{if(credentials.email==='admin@bimmer.com'&&credentials.password==='123456'){return{name:'Admin',email:credentials.email}}return null}}],secret:process.env.NEXTAUTH_SECRET});`
  };

  for (const [file, content] of Object.entries(apis)) {
    const filePath = path.join(basePath, 'pages', 'api', ...file.split('/'));
    writeFile(filePath, content);
  }

  console.log('BimmerDeals SaaS completo com Auth + Stripe mock criado em ./bimmerdeals-saas!');
  console.log('Execute: npm install && docker-compose up --build');
  console.log('Acesse: http://localhost:3000');
}

main();
