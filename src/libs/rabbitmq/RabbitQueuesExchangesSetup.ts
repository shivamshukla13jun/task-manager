import { Channel } from "amqplib";
import { EXCHANGE_NAMES, QUEUE_NAMES } from "./constants";
/**
 * ✅ Auto setup everything dynamically
 */
export default class RabbitQueuesExchangesSetup {

  /**
   * ✅ Setup all exchanges
   */
 static async setupExchanges(channel: Channel): Promise<void> {
     if (!channel) return;
    for (const exchange of Object.values(EXCHANGE_NAMES)) {
      await channel.assertExchange(exchange, 'topic', { durable: true });
    }
  }
  /**
   * ✅ Setup all queues + bindings
   */
 static async setupQueues(channel: Channel): Promise<void> {
    if (!channel) return;
       await channel.assertQueue(QUEUE_NAMES.AUTH, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AUTH, EXCHANGE_NAMES.AUTH, 'auth.*');
       await channel.assertQueue(QUEUE_NAMES.users, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.users, EXCHANGE_NAMES.users, 'users.*');
       await channel.assertQueue(QUEUE_NAMES.Email, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.Email, EXCHANGE_NAMES.Email, 'email.*');
  }
}