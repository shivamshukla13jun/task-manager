
import config from "config/env";
import createDefaultData from "seeders";

const initializeServices=async()=>{
    try {
    // Seed default data on boot when enabled (SEED_ON_BOOT=true)
    if (config.SEED_ON_BOOT) {
        await createDefaultData();
    }
    } catch (error) {
        console.log(error,"Failed to initialize services")
    }
}
export default initializeServices