import axios from "axios";



const hii=async()=>{
        const aa=await axios.get('https://api.github.com/users/ankiitsingh21');
        console.log(aa.data.followers);
}

hii();