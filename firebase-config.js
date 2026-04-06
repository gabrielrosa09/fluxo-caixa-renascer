// ================================================================
//  firebase-config.js
//  Preencha com as configurações do seu projeto Firebase.
//
//  PASSO A PASSO:
//  1. Acesse https://console.firebase.google.com
//  2. Clique em "Adicionar projeto" e siga os passos
//  3. No menu lateral vá em "Realtime Database" → Criar banco
//     - Escolha "Iniciar no modo de teste" (permite leitura/escrita)
//     - Selecione a região mais próxima
//  4. Vá em Configurações do projeto (ícone de engrenagem)
//     → "Seus apps" → clique em "</>" para adicionar app Web
//  5. Cole abaixo os valores que aparecerem
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyAU54LRX6_DU99FiV8jhOVkn7eyQFDMguk",
    authDomain: "lanchonete-shalom-e8232.firebaseapp.com",
    databaseURL: "https://lanchonete-shalom-e8232-default-rtdb.firebaseio.com",
    projectId: "lanchonete-shalom-e8232",
    storageBucket: "lanchonete-shalom-e8232.firebasestorage.app",
    messagingSenderId: "1028358133139",
    appId: "1:1028358133139:web:ed71a06ae7ace1ba29c466",
    measurementId: "G-0V9CH3B5R5"
  };

// ================================================================
//  CHAVE PIX
//  Coloque aqui sua chave PIX (telefone, CPF, e-mail ou aleatória)
// ================================================================
const PIX_KEY  = "SEU_PIX_AQUI";       // ex: "11999999999"
const PIX_NAME = "Lanchonete Renascer"; // Nome que aparece para o cliente

// ================================================================
//  CÓDIGO DE ACESSO DA COZINHA
//  Mude para um código que só sua equipe saiba
// ================================================================
const COZINHA_PIN = "1234";
