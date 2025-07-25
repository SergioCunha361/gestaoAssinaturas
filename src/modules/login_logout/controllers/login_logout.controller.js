// src/modules/login_logout/controllers/login_logout.controller.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

const Aluno = require('../../aluno/models/aluno.model');
const Instrutor = require('../../instrutor/models/instrutor.model');

const tempo_acess_token = process.env.TEMPO_ACESS_TOKEN;
const tempo_refresh_token = process.env.TEMPO_REFRESH_TOKEN;

class AutenticacaoController {
  static gerarTokenAcesso(dadosUsuario) {
    return jwt.sign(dadosUsuario, process.env.SECRET_KEY, {
      expiresIn: tempo_acess_token,
    });
  }

  static gerarRefressToken(dadosUsuario) {
    return jwt.sign(dadosUsuario, process.env.JWT_REFRESH_KEY, {
      expiresIn: tempo_refresh_token,
    });
  }

  static async login(req, res) {
    try {
      const { matricula, cref, senha } = req.body;

      if (!senha || (!matricula && !cref)) {
        return res.status(400).json({
          msg: "É necessário informar matrícula ou cref, e senha para login.",
        });
      }

      let usuario;
      let tipo;

      if (matricula) {
        usuario = await Aluno.findOne({ where: { matricula } });
        tipo = 'aluno';
      } else if (cref) {
        usuario = await Instrutor.findOne({ where: { cref } });
        tipo = 'instrutor';
      }

      if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
        return res.status(401).json({ msg: "Credenciais inválidas!" });
      }

      const dadosUsuario = {
        nome: usuario.nome,
        id: usuario.matricula || usuario.cref,
        tipo,
      };

      const tokenAcesso = AutenticacaoController.gerarTokenAcesso(dadosUsuario);
      const refreshToken = AutenticacaoController.gerarRefressToken(dadosUsuario);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 1 dia
      });

      res.status(200).json({
        msg: "Login realizado com sucesso!",
        tokenAcesso,
        nome: usuario.nome,
        id: dadosUsuario.id,
        tipo,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Erro interno do servidor. Por favor, tente mais tarde.",
        erro: error.message,
      });
    }
  }

  static refreshToken(req, res) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(403).json({ msg: "Refresh token inválido!" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (erro, usuario) => {
      if (erro) {
        return res.status(403).json({ msg: "Refresh Token inválido!" });
      }

      const dadosUsuario = {
        nome: usuario.nome,
        id: usuario.id,
        tipo: usuario.tipo,
      };

      const novoTokenAcesso = this.gerarTokenAcesso(dadosUsuario);
      res.status(200).json({ tokenAcesso: novoTokenAcesso });
    });
  }

  static async sair(req, res) {
    console.log(">>> Entrou no controller sair");
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "development",
        sameSite: "strict",
      });
      res.status(200).json({ msg: "Logout realizado com sucesso." });
    } catch (error) {
      res.status(500).json({
        msg: "Erro interno do servidor. Por favor, tente mais tarde.",
        erro: error.message,
      });
    }
  }
}

module.exports = AutenticacaoController;
