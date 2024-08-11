'use client';
import { Box, Button, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useState, useEffect } from "react";
import { firestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase';

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi, I'm the support agent, how can I assist you? (If you want to save your messages, please sign in)",
    }
  ]);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleAuthStateChange = async (user) => {
      console.log('User state changed:', user);
      if (user) {
        setUser(user);
        const docRef = doc(firestore, "chats", user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log('Chat history found:', docSnap.data().messages);
            setMessages(docSnap.data().messages);
          } else {
            console.log("No chat history found");
          }
        } catch (error) {
          console.error('Error fetching chat history:', error);
        }
      } else {
        setUser(null);
        setMessages([
          {
            role: 'assistant',
            content: "Hi, I'm the support agent, how can I assist you? (If you want to save your messages, please sign in)",
          }
        ]);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

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
      let assistantMessageIndex = finalMessages.length - 1;
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const text = decoder.decode(value, { stream: true });
        finalMessages = finalMessages.map((msg, index) => {
          if (index === assistantMessageIndex) {
            return { ...msg, content: msg.content + text };
          }
          return msg;
        });
  
        // Update the state incrementally
        setMessages(finalMessages);
      }
  
      // Final update to ensure last chunk of data is included
      setMessages(finalMessages);
  
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
      flexDirection={isMobile ? "column" : "row"}
      justifyContent="center"
      alignItems="center"
      bgcolor="#222222"
      position="relative"
    >
      {/* Left Side - Customer Support Label */}
      <Box
        position="fixed"
        top={16}
        left={16}
        display={isMobile ? "none" : "flex"}
        flexDirection="column"
        alignItems="center"
        color="white"
        zIndex={2} // Added zIndex to keep it on top
      >
        <Typography variant="h4" color="primary.main">
          Customer Support
        </Typography>
      </Box>

      {/* Sign In Button and User Info */}
      <Box
        position="fixed"
        top={16}
        right={16}
        display="flex"
        alignItems="center"
        gap={2}
        zIndex={2} // Added zIndex to keep it on top
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
        width={isMobile ? "90vw" : "500px"}
        height={isMobile ? "70vh" : "700px"}
        maxWidth={isMobile ? "100vw" : "90vw"} // Added max width for desktop screens
        maxHeight={isMobile ? "85vh" : "85vh"} // Added max height for desktop screens
        border="1px solid silver"
        p={2}
        spacing={3}
        bgcolor="black"
        zIndex={1} // Ensure chat box is below the fixed elements
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
                maxWidth="90%"
                alignSelf={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
                sx={{
                  lineHeight: '1.6',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                  padding: message.role === 'assistant' ? '24px 24px' : '16px 16px',
                }}
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
