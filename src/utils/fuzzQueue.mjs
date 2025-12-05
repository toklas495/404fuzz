class FuzzQueue{
    constructor(concurrency=500){
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    async add(task){
        if(this.running>=this.concurrency){
            await new Promise(resolve=> this.queue.push(resolve));
        }
        this.running++;
        try{
            return await task();
        }finally{
            this.running--;
            if(this.queue.length>0){
                const next = this.queue.shift();
                next();
            }
        }
    }

    async drain(){
        while(this.running>0||this.queue.length>0){
            await new Promise(r=>setImmediate(r))
        }
    }
}

export default FuzzQueue;