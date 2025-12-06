import theme from './theme.mjs';



export default function banner() {
  console.log(theme.warn("============================================================"));
  console.log(theme.info(`
     _____  _______      _____   _____                     
    /  |  | \\   _  \\    /  |  |_/ ____\\_ __________________
   /   |  |_/  /_\\  \\  /   |  |\\   __\\  |  \\___   /\\___   /
  /    ^   /\\  \\_/   \\/    ^   /|  | |  |  //    /  /    / 
  \\____   |  \\_____  /\\____   | |__| |____//_____ \\/_____ \\
       |__|        \\/      |__|                  \\/      \\/
`))

  console.log("");
  console.log(
    theme.success("        404fuzz") +
    theme.default(" — ") +
    theme.warn("fuzz with a brain 🧠")
  );

  console.log("");
  console.log(theme.debug("   Like an ant, 404fuzz never gets tired"));
  console.log(theme.info("   Author  : ") + theme.success("toklas495"));

  console.log(theme.warn("============================================================\n"));
}
