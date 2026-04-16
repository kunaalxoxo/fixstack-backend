import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
🚀 FixStack Backend Running
📡 API: http://localhost:${PORT}/api
✨ Hackathon Demo Mode: ON
  `);
});
