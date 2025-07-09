import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { conn } from '../db/conn';
import { RowDataPacket } from 'mysql2';

// Interface para definir a estrutura de um usuário
interface IUser {
    id?: number; // ID é opcional em algumas respostas
    name: string; // Nome é obrigatório
    email: string; // Email é obrigatório
    password?: string; // Senha é opcional em algumas respostas
}

// Função que agrupa e registra todas as rotas de gerenciamento de usuários
export async function userRoutes(fastify: FastifyInstance, opts: any) {

    // Rota para CRIAR um novo usuário (POST)
    fastify.post('/api/users', async (request: FastifyRequest<{ Body: IUser }>, reply: FastifyReply) => {
        const { name, email, password } = request.body;

        // Validação simples dos dados de entrada
        if (!name || !email || !password) {
            reply.status(400).send({ message: 'Nome, email e senha são obrigatórios.' });
            return;
        }

        try {
            const [result] = await conn.query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, password] // Em produção, use hashing para a senha!
            );
            const insertId = (result as any).insertId;
            reply.status(201).send({ id: insertId, name, email });
        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            // Verifica se o erro é de entrada duplicada (email já existe)
            if (error.code === 'ER_DUP_ENTRY') {
                reply.status(409).send({ message: 'O email fornecido já está em uso.' });
                return;
            }
            reply.status(500).send({ message: 'Erro interno do servidor ao criar usuário.' });
        }
    });

    // Rota para LER todos os usuários (GET)
    fastify.get('/api/users', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name, email, created_at FROM users');
            reply.send(rows);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao buscar usuários.' });
        }
    });

    // Rota para ATUALIZAR um usuário existente (PUT)
    fastify.put('/api/users/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: IUser }>, reply: FastifyReply) => {
        const id = parseInt(request.params.id, 10);
        const { name, email } = request.body;

        // Validação
        if (isNaN(id)) {
            reply.status(400).send({ message: 'ID de usuário inválido.' });
            return;
        }
        if (!name || !email) {
            reply.status(400).send({ message: 'Nome e email são obrigatórios.' });
            return;
        }

        try {
            const [result] = await conn.query(
                'UPDATE users SET name = ?, email = ? WHERE id = ?',
                [name, email, id]
            );

            if ((result as any).affectedRows === 0) {
                reply.status(404).send({ message: 'Usuário não encontrado.' });
                return;
            }

            reply.send({ id, name, email });
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            if (error.code === 'ER_DUP_ENTRY') {
                reply.status(409).send({ message: 'O email fornecido já está em uso por outro usuário.' });
                return;
            }
            reply.status(500).send({ message: 'Erro interno do servidor ao atualizar usuário.' });
        }
    });

    // Rota para DELETAR um usuário (DELETE)
    fastify.delete('/api/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const id = parseInt(request.params.id, 10);

        if (isNaN(id)) {
            reply.status(400).send({ message: 'ID de usuário inválido.' });
            return;
        }

        try {
            const [result] = await conn.query('DELETE FROM users WHERE id = ?', [id]);

            if ((result as any).affectedRows === 0) {
                reply.status(404).send({ message: 'Usuário não encontrado.' });
                return;
            }

            reply.status(204).send(); // 204 No Content
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao deletar usuário.' });
        }
    });
}

export default fastifyPlugin(userRoutes)