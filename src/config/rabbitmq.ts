//@ts-nocheck
import amqp, { Connection, Channel } from 'amqplib';
import config from './env';

const { RABBITMQ_URL, RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD } = config;

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      const connectionString = RABBITMQ_URL || `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
      
      this.connection = await amqp.connect(connectionString);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      console.log('✅ RabbitMQ connected successfully');

      // Handle connection close
      this.connection.on('close', () => {
        console.log('❌ RabbitMQ connection closed');
        this.isConnected = false;
        this.reconnect();
      });

      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    console.log('🔄 Attempting to reconnect to RabbitMQ...');
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.reconnect();
      }
    }, 5000);
  }

  async getChannel(): Promise<Channel> {
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }
    return this.channel!;
  }

  async publishMessage(exchange: string, routingKey: string, message: any): Promise<void> {
    try {
      const channel = await this.getChannel();
      
      // Assert exchange exists
      await channel.assertExchange(exchange, 'topic', { durable: true });
      
      // Publish message
      const messageBuffer = Buffer.from(JSON.stringify(message));
      channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now()
      });

      console.log(`📤 Message published to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      throw error;
    }
  }

  async consumeMessages(queue: string, callback: (message: any) => Promise<void>): Promise<void> {
    try {
      const channel = await this.getChannel();
      
      // Assert queue exists
      await channel.assertQueue(queue, { durable: true });
      
      // Consume messages
      await channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const message = JSON.parse(msg.content.toString());
            await callback(message);
            channel.ack(msg);
          } catch (error) {
            console.error('❌ Error processing message:', error);
            channel.nack(msg, false, false);
          }
        }
      });

      console.log(`📥 Started consuming messages from queue: ${queue}`);
    } catch (error) {
      console.error('❌ Failed to consume messages:', error);
      throw error;
    }
  }

  async createQueue(queue: string, options: any = {}): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.assertQueue(queue, { durable: true, ...options });
      console.log(`✅ Queue created: ${queue}`);
    } catch (error) {
      console.error('❌ Failed to create queue:', error);
      throw error;
    }
  }

  async createExchange(exchange: string, type: string = 'topic', options: any = {}): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.assertExchange(exchange, type, { durable: true, ...options });
      console.log(`✅ Exchange created: ${exchange}`);
    } catch (error) {
      console.error('❌ Failed to create exchange:', error);
      throw error;
    }
  }

  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.bindQueue(queue, exchange, routingKey);
      console.log(`✅ Queue ${queue} bound to exchange ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      console.error('❌ Failed to bind queue:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('✅ RabbitMQ connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
const rabbitMQConnection = new RabbitMQConnection();

export default rabbitMQConnection;
