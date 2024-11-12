const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { SolapiMessageService } = require('solapi');

const app = express();
app.use(cors());
app.use(express.json());

// CoolSMS 설정
const messageService = new SolapiMessageService('NCSFIHOTE2K7KZ2A', 'KGTACMVYA2SLMUALCBOTBEDU3CBTSVDQ');

// Temporary in-memory store for wallets, votes, and verification codes (in production, use a proper database)
const wallets = {};
const votes = {};
const verificationCodes = {};

// 후보자 이름 목록
const candidates = {
  'Candidate 1': '흐',
  'Candidate 2': '정현빈',
  'Candidate 3': '김유민',
  'Candidate 4': '가면맨',
  'Candidate 5': '제훈파티시엘',
  'Candidate 6': '멀티과 손흥민 이강인',
  'Candidate 7': '흥사차력쇼',
};

// Endpoint to send verification code via CoolSMS
app.post('/send-verification-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).send('전화번호가 필요합니다.');
  }

  // Generate a 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[phoneNumber] = verificationCode;

  try {
    // Send SMS using Solapi
    await messageService.send({
      to: phoneNumber,
      from: '01040616740', // CoolSMS에서 발신자 번호로 등록된 번호 사용
      text: `[별하제 장기자랑 투표] 인증번호는 ${verificationCode} 입니다. 5분 이내에 입력해 주세요.`,
    });
    console.log(`Verification code sent to: ${phoneNumber}, Code: ${verificationCode}`);
    res.status(200).send({ message: '인증 코드가 발송되었습니다.' });
  } catch (error) {
    console.error('Failed to send CoolSMS:', error);
    res.status(500).send('SMS 전송에 실패했습니다.');
  }
});

// Endpoint to generate wallet after verifying code
app.post('/generate-wallet', async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).send('전화번호와 인증 코드가 필요합니다.');
  }

  // Verify the code
  if (verificationCodes[phoneNumber] !== code) {
    return res.status(400).send('유효하지 않은 인증 코드입니다.');
  }

  // Generate a new wallet
  const wallet = ethers.Wallet.createRandom();
  wallets[phoneNumber] = wallet;

  // Clear the verification code after successful verification
  delete verificationCodes[phoneNumber];

  console.log('Wallet 생성됨:', wallet.address);
  res.status(200).send({ address: wallet.address });
});

// Endpoint to vote
app.post('/vote', (req, res) => {
  const { phoneNumber, candidate } = req.body;
  const wallet = wallets[phoneNumber];

  if (!wallet) {
    return res.status(400).send('오류가 발생했습니다.');
  }

  if (votes[phoneNumber]) {
    return res.status(400).send('이미 투표를 완료했습니다.');
  }

  // Register the vote
  votes[phoneNumber] = candidate;

  const candidateName = candidates[candidate] || candidate;

  console.log(`투표 등록: ${phoneNumber} 님이 ${candidateName} 후보에게 투표했습니다.`); // Log the vote for debugging

  // Log the current vote tally
  logCurrentVoteTally();

  res.status(200).send(`지갑 주소 ${wallet.address} 로 ${candidateName} 에게 투표 완료했습니다.`);
});

// Endpoint to get real-time vote counts
app.get('/results', (req, res) => {
  const results = {};
  Object.values(votes).forEach((candidate) => {
    const candidateName = candidates[candidate] || candidate;

    if (!results[candidateName]) {
      results[candidateName] = 0;
    }
    results[candidateName] += 1;
  });

  console.log('현재 투표 결과:', results); // Log the results for debugging

  res.status(200).send(results);
});

// Function to log the current vote tally
function logCurrentVoteTally() {
  const results = {};
  Object.values(votes).forEach((candidate) => {
    const candidateName = candidates[candidate] || candidate;

    if (!results[candidateName]) {
      results[candidateName] = 0;
    }
    results[candidateName] += 1;
  });

  console.log('현재 총 투표 집계:', results); // Log the current tally
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
