import 'dotenv/config';
import app from './app.js';
import './config/db.js'; // establishes the read-only connection and logs snapshot info

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`[bridge] PlusOne bridge API running on port ${PORT}`);
  console.log(`[bridge] This service is READ-ONLY against a PlusOne data snapshot.`);
  console.log(`[bridge] It never modifies, executes, or loads any PlusOne extension source files.`);
});
