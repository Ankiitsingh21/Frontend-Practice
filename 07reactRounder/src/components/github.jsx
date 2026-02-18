import React from 'react'
import axios from 'axios';
import { useLoaderData } from 'react-router-dom';

function Github() {
        const data=useLoaderData();


        // const [data, setData] = useState(null);

        // useEffect(() => {
        //   const fetchData = async () => {
        //     try {
        //       const res = await axios.get(
        //         "https://api.github.com/users/ankiitsingh21"
        //       );
        //       setData(res.data.followers);
        //     } catch (error) {
        //       console.error(error);
        //     }
        //   };
        
        //   fetchData();
        // }, []);
        // console.log(data.followers);
  return (
    <div className='text-center mr-4 text-white bg-gray-600 text-3xl' >
        Github Followers:{data.followers}
    </div>
  )
}

export default Github


export const GithubInforLoader =async()=>{
        try {
              const res = await axios.get(
                "https://api.github.com/users/ankiitsingh21"
              );
        //       setData(res.data.followers);
               return  res.data
        //        return val.data.followers;
            } catch (error) {
              console.error(error);
            }
}
