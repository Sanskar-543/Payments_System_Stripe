import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectDB = async () => {
    try {
    const db_connection_instance = await drizzle(`${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`);

    console.log("\n Drizzle Connected Succesfully!! \n",db_connection_instance)
} catch (error) {
    console.log("Drizzle Connection Failed!!")
    process.exit(1)
}
}

export default connectDB
