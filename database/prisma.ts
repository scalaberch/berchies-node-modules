// import { PrismaClient } from "@prisma/client";

//export const prisma = new PrismaClient();



// let prisma: PrismaClient | null =  null;


const init = async (appConfig: any) => {
  // if (!prisma) {
  //   // prisma = new PrismaClient();
  //   console.log("PrismaClient initialized");
  // }
  // return prisma;
};
  


const find = async (table: string, where: any) => {
  // if (!prisma) {
  //   throw new Error("PrismaClient is not initialized");
  // }
  // if (!prisma[table]) {
  //   throw new Error(`Table ${table} does not exist in Prisma schema`);
  // }
  // return await prisma[table].findMany();
};



export {
  // prisma
}

export default  {
  
  init,
  find,
  
};
