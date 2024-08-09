'use client'
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { firestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi, I'm the support agent, how can I assist you?",
    }
  ]);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const docRef = doc(firestore, "chats", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMessages(docSnap.data().messages);
        } else {
          console.log("No chat history found");
        }
      } else {
        setUser(null);
        setMessages([
          {
            role: 'assistant',
            content: "Hi, I'm the support agent, how can I assist you?",
          }
        ]);
      }
    });
  
    return () => unsubscribe();
  }, []);
  

  // authentication
  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);
  
    const newMessages = [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ];
  
    setMessage('');
    setMessages(newMessages);
  
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMessages),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalMessages = [...newMessages];
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        finalMessages = finalMessages.map((msg, index) => {
          if (index === finalMessages.length - 1) {
            return { ...msg, content: msg.content + text };
          }
          return msg;
        });
  
        setMessages(finalMessages);
      }
  
      if (user) {
        const docRef = doc(firestore, "chats", user.uid);
        await setDoc(docRef, { messages: finalMessages });
      }
  
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    }
  
    setIsLoading(false);
  };
  

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
<Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#222222"
    >
      {/* Sign In Button and User Info */}
      <Box
        position="absolute"
        top={16}
        right={16}
        display="flex"
        alignItems="center"
        gap={2}
      >
        {user && (
          <Typography color="white">
            Hello, {user.displayName || user.email}!
          </Typography>
        )}
        {user ? (
          <Button variant="contained" color="secondary" onClick={handleSignOut}>
            Sign Out
          </Button>
        ) : (
          <Button variant="contained" color="primary" onClick={handleGoogle}>
            Sign In
          </Button>
        )}
      </Box>

      <Stack
        direction="column"
        width="500px"
        height="700px"
        border="1px solid silver"
        p={2}
        spacing={3}
        bgcolor="black"
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? 'primary.main'
                    : 'secondary.main'
                }
                color="white"
                borderRadius={16}
                p={3}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            sx={{
              '& .MuiInputBase-root': {
                color: 'silver',
              },
              '& .MuiInputLabel-root': {
                color: 'silver',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'silver',
                },
                '&:hover fieldset': {
                  borderColor: 'silver',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'silver',
                },
              },
              '&.Mui-focused .MuiInputBase-input': {
                color: 'silver',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
