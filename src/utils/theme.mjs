import chalk from "chalk";

const theme = {
  success: chalk.greenBright.bold,   // small “success / payload loaded”
  error: chalk.redBright.bold,       // danger / crash / alert
  warn: chalk.yellowBright.bold,     // fuzz / chaotic lines
  info: chalk.cyanBright,            // main ASCII cartoon
  debug: chalk.magentaBright,        // minor details / brain signals
  default: chalk.whiteBright          // default fallback / clean lines
}


export default theme;