import api from "./api";

const fetchUserData = async () => {
  try {
    const userRes = await api.get("/user");  
    console.log("User data:", userRes.data);

    const coursesRes = await api.get("/courses");
    console.log("Courses data:", coursesRes.data);

    return {
      user: userRes.data,
      courses: coursesRes.data
    };
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
};

export default fetchUserData;

