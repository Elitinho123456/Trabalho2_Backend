// server/server.ts
import Fastify from "fastify";
import cors from '@fastify/cors'; // Melhor usar o import direto

const fastify = Fastify({ logger: true });

// Registra o CORS para aceitar requisições de qualquer origem
fastify.register(cors, { 
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Registra os plugins de rotas
fastify.register(require("./Routes/userManagement"));
fastify.register(require("./Routes/gamesManagement"));
fastify.register(require("./Routes/reportsManagement")); // Agora registra o plugin unificado
fastify.register(require("./Routes/bannerManagement"));

fastify.listen({ port: 8888 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Servidor rodando no endereço ${address}`);
});


// Configuração de CORS para permitir requisições do frontend
fastify.register(async function (fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (request.method === 'OPTIONS') {
            reply.status(200).send();
            
        }
    });
});
