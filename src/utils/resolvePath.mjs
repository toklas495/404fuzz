import os from 'os';
import path from 'path';

function resolveHome(filePath){
    if(filePath.startsWith("~")){
        return path.join(os.homedir(),filePath.slice(1));
    }
    return filePath;
}

export default resolveHome;