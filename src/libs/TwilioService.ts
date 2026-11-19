// services/TwilioService.ts

import config from "config/env";

class TwilioService {
  private static instance: TwilioService;
  private client: any = null;
  private senderNumber: string;

  private constructor() {
    this.senderNumber = config.TWILIO_PHONE_NUMBER as string;
    this.init();
  }

  public static getInstance() {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  private init() {
    try {
      if (config.TWILIO_SID && config.TWILIO_AUTH_TOKEN) {
        // Loaded lazily so the app still boots when twilio isn't installed
        const twilio = require("twilio");
        this.client = twilio(
          config.TWILIO_SID,
          config.TWILIO_AUTH_TOKEN
        );
      }
    } catch (err: any) {
      console.error("Twilio init error", err.message);
    }
  }

  private formatPhone(phone: string) {
    if(!phone){
      throw new Error("Phone No Is Required")
    }
    else if (!phone.startsWith("+")) {
        throw new Error("Phone No SHould Start From +")
    }
    return phone;
  }

 async sendSMS(phone: string, message: string) {
  try {
    if (!this.client) {
      return {
        success: true,
        message: "Twilio not initialized",
      };
    }

    const formattedPhone = this.formatPhone(phone);

    const response = await this.client.messages.create({
      body: message,
      from: this.senderNumber,
      to: formattedPhone,
    });

    return {
      success: true,
      message: "SMS sent successfully",
      data: response,
    };

  } catch (error: any) {
    return {
      success: true, // as per your requirement
      message: error?.message || "Failed to send SMS",
      errorCode: error?.code, // optional but useful
    };
  }
}
}

export default TwilioService.getInstance();