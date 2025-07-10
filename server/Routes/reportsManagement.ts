import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conn } from "../db/conn";
import { RowDataPacket } from 'mysql2';
import fastifyPlugin from 'fastify-plugin';

async function reportRoutes(fastify: FastifyInstance) {

    // =======================================================
    // RELATÓRIO - MINECRAFT DUNGEONS
    // =======================================================
    fastify.get('/api/relatorio/itens', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = `
                SELECT i.id, i.nome, i.poder, i.raridade, c.nome AS nome_categoria
                FROM itens_d AS i INNER JOIN categorias_d AS c ON i.categoria_id = c.id
            `;
            const [rows] = await conn.query(query);
            reply.send(rows);
        } catch (error) {
            console.error("Erro ao gerar relatório do Dungeons:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao gerar relatório do Dungeons.' });
        }
    });

    // =======================================================
    // RELATÓRIO - DOWNLOADS DE PRODUTOS POR USUÁRIO
    // =======================================================
    fastify.get('/api/reports/user-downloads', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = `
            SELECT
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                p.id as product_id,
                p.name as product_name,
                pt.name as product_type,
                ud.download_date
            FROM user_downloads ud
            INNER JOIN users u ON ud.user_id = u.id
            INNER JOIN products p ON ud.product_id = p.id
            INNER JOIN product_types pt ON p.type_id = pt.id
            ORDER BY ud.download_date DESC;
        `;
        try {
            const [rows] = await conn.query<RowDataPacket[]>(query);
            reply.send(rows);
        } catch (error) {
            console.error("Erro ao gerar relatório de downloads:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao gerar relatório de downloads.' });
        }
    });
}

// Exportando como um único plugin
export default fastifyPlugin(reportRoutes);