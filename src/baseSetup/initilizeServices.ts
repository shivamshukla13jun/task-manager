import { initializeBullMQ } from "libs/bullmq";
import { initializeConsumers } from "libs/rabbitmq/consumers";
import { rabbitMQService } from "libs/rabbitmq/rabbitmq.service";
import { connectRedis } from "libs/redis";
import config from "config/env";
import createDefaultData from "seeders";

const initializeServices=async()=>{
    try {
    // Initialize RabbitMQ
    await rabbitMQService.initialize();
        // Connect Redis
    await connectRedis();
    // console.log('✅ Redis connected');
    await  initializeConsumers()
    // // Initialize BullMQ before migrations
    await initializeBullMQ();
    console.log('✅ BullMQ initialized');

    // Seed default data on boot when enabled (SEED_ON_BOOT=true)
    if (config.SEED_ON_BOOT) {
        await createDefaultData();
    }
    } catch (error) {
        console.log(error,"Failed to initialize services")
    }
}
export default initializeServices