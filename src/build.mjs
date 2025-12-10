import clusterEngine from "./engine/clusterEngine.mjs";

const builder = {
    async fuzz(argv){
        try{
            await clusterEngine(argv);
        }catch(error){
            throw error;
        }
    }
}

export default builder;