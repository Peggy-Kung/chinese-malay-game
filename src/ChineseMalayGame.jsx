import React, { useState, useEffect, useCallback } from 'react';

const ChineseMalayGame = () => {
  // 音效功能
  const playSound = (frequency, duration, type = 'sine') => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playCorrectSound = () => {
    // 播放成功音效：上升的音调
    playSound(523, 0.1); // C5
    setTimeout(() => playSound(659, 0.1), 100); // E5
    setTimeout(() => playSound(784, 0.2), 200); // G5
  };

  const playWrongSound = () => {
    // 播放错误音效：下降的音调
    playSound(400, 0.3, 'sawtooth');
  };

  const playCompleteSound = () => {
    // 播放完成音效：胜利音调
    playSound(523, 0.1); // C5
    setTimeout(() => playSound(659, 0.1), 100); // E5
    setTimeout(() => playSound(784, 0.1), 200); // G5
    setTimeout(() => playSound(1047, 0.3), 300); // C6
  };
  const wordPairs = [
    { chinese: '交通工具', malay: 'kenderaan' },
    { chinese: '状况', malay: 'situasi' },
    { chinese: '安全带', malay: 'tali pinggang keledar' },
    { chinese: '出发', malay: 'bertolak' },
    { chinese: '标签', malay: 'label' },
    { chinese: '零食', malay: 'makanan ringan' },
    { chinese: '材料', malay: 'ramuan' },
    { chinese: '色素', malay: 'pewarna' },
    { chinese: '防腐剂', malay: 'bahan pengawet' }
  ];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [builtWord, setBuiltWord] = useState('');
  const [fallingLetters, setFallingLetters] = useState([]);
  const [catcher, setCatcher] = useState({ x: 350, y: 520 });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState('ready'); // ready, playing, completed
  const [particles, setParticles] = useState([]);
  const [clouds, setClouds] = useState([]);
  const [catcherEmotion, setCatcherEmotion] = useState('😊');
  const [message, setMessage] = useState('点击开始按钮开始游戏！');
  const [messageType, setMessageType] = useState('');
  
  const gameWidth = 800;
  const gameHeight = 600;
  const catcherWidth = 100;

  // 初始化游戏
  useEffect(() => {
    const currentPair = wordPairs[currentWordIndex];
    setTargetWord(currentPair.malay);
    setBuiltWord('');
    setLevel(currentWordIndex + 1);
  }, [currentWordIndex]);

  // 初始化云朵
  useEffect(() => {
    const initialClouds = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      x: Math.random() * gameWidth,
      y: Math.random() * 150 + 30,
      size: Math.random() * 30 + 25,
      speed: Math.random() * 0.3 + 0.1
    }));
    setClouds(initialClouds);
  }, []);

  // 云朵动画
  useEffect(() => {
    const cloudInterval = setInterval(() => {
      setClouds(prev => prev.map(cloud => ({
        ...cloud,
        x: cloud.x > gameWidth ? -cloud.size : cloud.x + cloud.speed
      })));
    }, 100);
    return () => clearInterval(cloudInterval);
  }, []);

  // 中文语音播放
  const speakChinese = (text) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.7;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = speechSynthesis.getVoices();
      const chineseVoice = voices.find(voice => 
        voice.lang.includes('zh') || voice.name.includes('Chinese')
      );
      
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      
      utterance.onstart = () => {
        showMessage('🔊 正在播放中文发音...', 'success');
      };
      
      utterance.onend = () => {
        if (gameState === 'playing') {
          showMessage('点击掉落的字母来拼出马来文单词！', 'success');
        }
      };
      
      utterance.onerror = () => {
        showMessage(`语音播放失败。中文词语是: ${text}`, 'error');
      };
      
      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        showMessage(`语音不可用。中文词语是: ${text}`, 'error');
      }
    } else {
      showMessage(`语音不支持。中文词语是: ${text}`, 'error');
    }
  };

  // 显示消息
  const showMessage = (text, type = '') => {
    setMessage(text);
    setMessageType(type);
  };

  // 生成彩色字母
  const getLetterColor = (letter) => {
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400'];
    return colors[letter.charCodeAt(0) % colors.length];
  };

  // 生成随机字母
  const generateRandomLetter = () => {
    // 创建字母池：目标单词的所有字母 + 常见字母
    const targetLetters = targetWord.split('');
    const commonLetters = 'abcdefghijklmnopqrstuvwxyz '.split('');
    
    // 混合目标字母和随机字母，目标字母出现更多次以增加几率
    const letterPool = [
      ...targetLetters, // 目标单词的字母各出现一次
      ...targetLetters, // 目标单词的字母再出现一次（增加几率）
      ...commonLetters  // 随机字母
    ];
    
    // 从字母池中随机选择
    return letterPool[Math.floor(Math.random() * letterPool.length)];
  };

  // 创建粒子效果
  const createParticles = (x, y, isCorrect = true) => {
    const newParticles = Array.from({ length: isCorrect ? 15 : 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x + Math.random() * 20 - 10,
      y: y + Math.random() * 20 - 10,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      life: 1,
      color: isCorrect ? '✨' : '💥',
      size: Math.random() * 10 + 5
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  // 更新粒子
  useEffect(() => {
    const particleInterval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.3,
        life: particle.life - 0.02
      })).filter(particle => particle.life > 0));
    }, 50);
    return () => clearInterval(particleInterval);
  }, []);

  // 键盘控制
  const handleKeyPress = useCallback((event) => {
    if (gameState !== 'playing') return;
    
    if (event.key === 'ArrowLeft') {
      setCatcher(prev => ({ ...prev, x: Math.max(0, prev.x - 40) }));
    } else if (event.key === 'ArrowRight') {
      setCatcher(prev => ({ ...prev, x: Math.min(gameWidth - catcherWidth, prev.x + 40) }));
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // 生成掉落字母
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      const letter = generateRandomLetter();
      const newLetter = {
        id: Date.now(),
        letter: letter,
        x: Math.random() * (gameWidth - 50),
        y: -30,
        speed: 2.5 + Math.random() * 1.5, // 加快速度
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5, // 减慢旋转
        color: getLetterColor(letter),
        wobble: Math.random() * Math.PI * 2
      };
      setFallingLetters(prev => [...prev, newLetter]);
    }, 1200); // 减少密集度，增加间隔

    return () => clearInterval(interval);
  }, [gameState, builtWord, targetWord]);

  // 游戏主循环
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = setInterval(() => {
      setFallingLetters(prev => {
        const updated = prev.map(letter => ({
          ...letter,
          y: letter.y + letter.speed,
          rotation: letter.rotation + letter.rotationSpeed,
          wobble: letter.wobble + 0.08, // 减慢摆动
          x: letter.x + Math.sin(letter.wobble) * 0.2 // 减少横向摆动
        }));

        const remaining = [];
        let newScore = score;
        let newBuiltWord = builtWord;

        updated.forEach(letter => {
          if (letter.y >= catcher.y - 40 && letter.y <= catcher.y + 40 &&
              letter.x >= catcher.x - 40 && letter.x <= catcher.x + catcherWidth + 40) {
            
            const nextNeededLetter = targetWord[builtWord.length];
            if (letter.letter === nextNeededLetter) {
              // 正确字母
              newBuiltWord += letter.letter;
              newScore += 10;
              setCatcherEmotion('🤩');
              createParticles(letter.x + 20, letter.y + 20, true);
              showMessage('正确！Betul!', 'success');
              playCorrectSound();
              
              setTimeout(() => setCatcherEmotion('😊'), 1000);
            } else {
              // 错误字母
              newScore = Math.max(0, newScore - 3);
              setCatcherEmotion('😵');
              createParticles(letter.x + 20, letter.y + 20, false);
              showMessage('错误！Salah!', 'error');
              playWrongSound();
              
              setTimeout(() => setCatcherEmotion('😊'), 800);
            }
          } else if (letter.y < gameHeight - 50) {
            remaining.push(letter);
          }
        });

        setScore(newScore);
        setBuiltWord(newBuiltWord);

        return remaining;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, catcher, builtWord, targetWord, score]);

  // 检查单词完成
  useEffect(() => {
    if (builtWord === targetWord && targetWord && gameState === 'playing') {
      setGameState('completed');
      setCatcherEmotion('🎉');
      createParticles(catcher.x + 50, catcher.y, true);
      showMessage(`完成了！单词: ${targetWord}`, 'success');
      playCompleteSound();
    }
  }, [builtWord, targetWord, gameState]);

  // 开始游戏
  const startGame = () => {
    setGameState('playing');
    setBuiltWord('');
    setFallingLetters([]);
    setCatcher({ x: 350, y: 520 });
    setCatcherEmotion('😊');
    
    const currentPair = wordPairs[currentWordIndex];
    speakChinese(currentPair.chinese);
  };

  // 重置单词
  const resetWord = () => {
    setGameState('ready');
    setBuiltWord('');
    setFallingLetters([]);
    setCatcherEmotion('😊');
    showMessage('点击开始按钮开始游戏！', '');
  };

  // 下一个单词
  const nextWord = () => {
    const nextIndex = (currentWordIndex + 1) % wordPairs.length;
    setCurrentWordIndex(nextIndex);
    setGameState('ready');
    setBuiltWord('');
    setFallingLetters([]);
    setCatcherEmotion('😊');
    showMessage(`第 ${nextIndex + 1} 关！点击开始！`, '');
  };

  // 重复播放中文
  const repeatChinese = () => {
    const currentPair = wordPairs[currentWordIndex];
    speakChinese(currentPair.chinese);
  };

  const currentPair = wordPairs[currentWordIndex];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold', 
        color: 'white', 
        marginBottom: '20px', 
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        animation: 'bounce 2s infinite'
      }}>
        🎮 中文马来文字母游戏 🎮
      </h1>
      
      <p style={{ 
        color: 'white', 
        fontSize: '1.2rem', 
        marginBottom: '20px', 
        textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '10px 20px',
        borderRadius: '25px',
        backdropFilter: 'blur(10px)'
      }}>
        看中文词语，接住字母拼出马来文单词！
      </p>

      {/* 游戏信息 */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '20px', 
        color: 'white', 
        fontWeight: 'bold',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          padding: '10px 20px', 
          borderRadius: '25px', 
          backdropFilter: 'blur(10px)' 
        }}>
          关卡: {level} 🎯
        </div>
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          padding: '10px 20px', 
          borderRadius: '25px', 
          backdropFilter: 'blur(10px)' 
        }}>
          得分: {score} 🏆
        </div>
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          padding: '10px 20px', 
          borderRadius: '25px', 
          backdropFilter: 'blur(10px)' 
        }}>
          进度: {builtWord.length}/{targetWord.length} 📝
        </div>
      </div>

      {/* 中文词语显示 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', 
        padding: '20px 40px', 
        borderRadius: '20px', 
        marginBottom: '20px', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        border: '4px solid white'
      }}>
        <div style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#8b0000', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)' 
        }}>
          {currentPair.chinese}
        </div>
      </div>

      {/* 游戏区域 */}
      <div style={{ 
        position: 'relative', 
        border: '4px solid white', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        marginBottom: '20px',
        width: gameWidth, 
        height: gameHeight, 
        background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 70%, #90EE90 100%)'
      }}>
        {/* 云朵 */}
        {clouds.map(cloud => (
          <div
            key={cloud.id}
            style={{ 
              position: 'absolute',
              left: cloud.x, 
              top: cloud.y, 
              fontSize: cloud.size,
              opacity: 0.6,
              filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.1))',
              color: 'white'
            }}
          >
            ☁️
          </div>
        ))}

        {/* 粒子效果 */}
        {particles.map(particle => (
          <div
            key={particle.id}
            style={{ 
              position: 'absolute',
              left: particle.x, 
              top: particle.y,
              opacity: particle.life,
              fontSize: particle.size,
              transform: `scale(${particle.life})`,
              pointerEvents: 'none'
            }}
          >
            {particle.color}
          </div>
        ))}

        {/* 掉落字母 */}
        {fallingLetters.map(letter => (
          <div
            key={letter.id}
            style={{ 
              position: 'absolute',
              width: '48px',
              height: '48px',
              backgroundColor: getLetterColor(letter.letter) === 'bg-red-400' ? '#f87171' :
                              getLetterColor(letter.letter) === 'bg-orange-400' ? '#fb923c' :
                              getLetterColor(letter.letter) === 'bg-yellow-400' ? '#facc15' :
                              getLetterColor(letter.letter) === 'bg-green-400' ? '#4ade80' :
                              getLetterColor(letter.letter) === 'bg-blue-400' ? '#60a5fa' :
                              getLetterColor(letter.letter) === 'bg-purple-400' ? '#c084fc' : '#f472b6',
              border: '3px solid white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.5rem',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transition: 'transform 0.1s',
              left: letter.x, 
              top: letter.y,
              transform: `rotate(${letter.rotation}deg)`,
              filter: 'drop-shadow(2px 2px 6px rgba(0,0,0,0.3))'
            }}
            onClick={() => {
              const nextNeededLetter = targetWord[builtWord.length];
              if (letter.letter === nextNeededLetter) {
                setBuiltWord(prev => prev + letter.letter);
                setScore(prev => prev + 10);
                setCatcherEmotion('🤩');
                createParticles(letter.x + 20, letter.y + 20, true);
                showMessage('正确！Betul!', 'success');
                playCorrectSound();
                
                setTimeout(() => setCatcherEmotion('😊'), 1000);
              } else {
                setScore(prev => Math.max(0, prev - 3));
                setCatcherEmotion('😵');
                createParticles(letter.x + 20, letter.y + 20, false);
                showMessage('错误！Salah!', 'error');
                playWrongSound();
                
                setTimeout(() => setCatcherEmotion('😊'), 800);
              }
              
              setFallingLetters(prev => prev.filter(l => l.id !== letter.id));
            }}
          >
            {letter.letter}
          </div>
        ))}

        {/* 接取器 */}
        <div
          style={{ 
            position: 'absolute',
            background: 'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)',
            border: '4px solid white',
            borderRadius: '50%',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            left: catcher.x, 
            top: catcher.y, 
            width: catcherWidth, 
            height: 50,
            filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '2rem' 
          }}>
            {catcherEmotion}
          </div>
          <div style={{ 
            position: 'absolute', 
            top: '-8px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: '#facc15', 
            fontSize: '1.5rem' 
          }}>
            ⭐
          </div>
        </div>
      </div>

      {/* 已拼单词显示 */}
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        backdropFilter: 'blur(10px)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px', 
        minHeight: '80px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        border: '2px solid white',
        minWidth: '300px'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: '#facc15', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)', 
          minHeight: '40px', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          {builtWord || '准备开始...'}
        </div>
      </div>

      {/* 消息显示 */}
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: 'bold', 
        marginBottom: '20px', 
        padding: '15px 25px', 
        borderRadius: '8px', 
        minHeight: '50px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minWidth: '400px',
        textAlign: 'center',
        backgroundColor: messageType === 'success' ? 'rgba(34, 197, 94, 0.8)' :
                         messageType === 'error' ? 'rgba(239, 68, 68, 0.8)' :
                         'rgba(255,255,255,0.2)',
        color: 'white'
      }}>
        {message}
      </div>

      {/* 控制按钮 */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        flexWrap: 'wrap', 
        justifyContent: 'center' 
      }}>
        <button
          onClick={startGame}
          disabled={gameState === 'playing'}
          style={{ 
            padding: '12px 24px', 
            background: gameState === 'playing' ? 'rgba(107, 114, 128, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 
            color: 'white', 
            borderRadius: '25px', 
            border: 'none',
            fontWeight: 'bold', 
            fontSize: '1.1rem', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            cursor: gameState === 'playing' ? 'not-allowed' : 'pointer',
            transform: gameState === 'playing' ? 'none' : 'scale(1)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (gameState !== 'playing') {
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            if (gameState !== 'playing') {
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          🔊 开始 START
        </button>
        
        <button
          onClick={resetWord}
          style={{ 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)', 
            color: 'white', 
            borderRadius: '25px', 
            border: 'none',
            fontWeight: 'bold', 
            fontSize: '1.1rem', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔄 重置 RESET
        </button>
        
        <button
          onClick={nextWord}
          style={{ 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', 
            color: 'white', 
            borderRadius: '25px', 
            border: 'none',
            fontWeight: 'bold', 
            fontSize: '1.1rem', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          ➡️ 下一个 NEXT
        </button>
        
        <button
          onClick={repeatChinese}
          style={{ 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #facc15 0%, #f97316 100%)', 
            color: 'white', 
            borderRadius: '25px', 
            border: 'none',
            fontWeight: 'bold', 
            fontSize: '1.1rem', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔊 重复 REPEAT
        </button>
      </div>

      {/* 操作说明 */}
      <div style={{ 
        marginTop: '20px', 
        color: 'white', 
        textAlign: 'center', 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        padding: '20px', 
        borderRadius: '12px', 
        backdropFilter: 'blur(10px)',
        maxWidth: '600px'
      }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
          🎮 点击掉落的字母或用 ← → 键移动接取器
        </p>
        <p style={{ fontSize: '1rem', margin: 0 }}>
          听中文发音，按顺序拼出马来文单词！
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default ChineseMalayGame;