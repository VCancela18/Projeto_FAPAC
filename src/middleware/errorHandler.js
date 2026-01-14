module.exports = (err, req, res, next) => {

    console.error('Erro Capturado Globalmente:', err.message, err.stack);

    // Tenta usar o status do erro (se existir) ou usa 500 (Internal Server Error)
    const statusCode = err.status || 500;

    // Envia a resposta de erro
    res.status(statusCode).json({
        ok: false,
        error: err.message || 'Internal server error',
    });
};