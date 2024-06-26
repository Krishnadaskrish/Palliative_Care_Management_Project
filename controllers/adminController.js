const Patients=require("../models/patientModel")
const User=require("../models/userModel")
const Manager=require("../models/managerModel")
const Medicine = require("../models/medicineModel");
const MedicineDistribution=require("../models/MdcnDstrbtionModel")
const visitors=require("../models/visitorModel")
const Feedback=require("../models/feedbackModel")
const Appointments=require("../models/appointmentModel")
const bcrypt=require("bcrypt")
const {getAttendanceForTimeInterval}=require("../config/attendanceUtils")


//pwd hashing here

const securePassword =async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};




module.exports={

  securePassword,

// ===============================< Login >================================//

    loadLogin: async (req, res) => {
        try {
            res.render("admin/login", { error: null, message: null });
        } catch (error) {
            console.log(error.message);
            res.status(500).send("Internal Server Error");
        }
    },


    AdminLogin: async (req, res) => {
        const { email, password } = req.body;
        try {
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                req.session.admin = true;
                return res.redirect("/admin/dashboard");
            } else {
                return res.redirect("/admin/login?error=Invalid email or password");
            }
        } catch (error) {
            console.log(error.message);
            res.status(500).send("Internal Server Error");
        }
    },
    

    
    // ===============================< Admin Logout >================================//
    
    logoutAdmin:(req, res) => {
      req.session.destroy();
      res.redirect("/admin/login");
    },

    
    // ===============================< Volunteer Management >================================//
    
          AdminDashboard : async (req, res) => {
            const { q } = req.query;
            try {
              let users;
              if (q && q.length > 0) {
                users = await User.find({
                  name: { $regex: ".*" + q + ".*" },
                  is_volunteer:1,
                  is_verified: { $in:[0, 1] }
                });
              } else {
                users = await User.find({
                  is_volunteer:1,
                  is_varified: { $in:[0, 1] }
                });
              }
              res.render("admin/dashboard", { users, q });
            } catch (error) {
              console.log(error.message);
              res.status(500).send("Internal Server Error");
            }
          },
    

  AdminAddedVolunteer : async (req, res) => {
    try {
      res.render("admin/createVolunteers", { error: null, message: null });
    } catch (error) {
      console.log(error.message);
    }
  },


createVolunteer : async (req, res) => {
  const { name, email, password, mobile,  } = req.body;
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  try {
    if (!email)
      return res.render("admin/createVolunteers", { error: "Email is required" });
    if (!emailRegex.test(email))
      return res.render("admin/user_new", {
        error: "Email must be a valid email!",
      });
      if(password<6){
        return res.render("admin/createVolunteers", {
          message: null,
          error: "password must be atleast 6 letters",
        });
      }
    const isExists = await User.findOne({ email });
    if (isExists)
      return res.render("admin/createVolunteers", {
        error: "User already exists",
        message: null,
      });
      const secPassword = await securePassword(req.body.password);
    const user = new User({
      name,
      email,
      mobile,
      password:secPassword,
      is_volunteer:1,
      is_varified:1,
    });
    await user.save();
    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(error.message);
  }
},
    
      loadEditVolunteer : async (req, res) => {
        const { id } = req.params;
        try {
          const user = await User.findById(id);
          res.render("admin/editVolunteers", { user });
        } catch (error) {
          console.log(error);
        }
      },


      updateVolunteer : async (req, res) => {
        const { id } = req.params;
        const { name, email, mobile, is_varified } = req.body;
        try {
          const user = await User.findByIdAndUpdate(
            id,
            {
              $set: {
                name,
                email,
                mobile,
                is_varified,
              },
            },
            { new: true }
          );
          res.redirect("/admin/dashboard");
        } catch (error) {
          console.log(error);
        }
      },

      // deleteVolunteer: async (req, res) => {
      //   const { id } = req.params;
      //   try {
      //     const user = await User.findOneAndDelete({ _id: id });
      //     if (req.session.user_session === user._id) {
      //       req.session.destroy();
      //     }
      //     return res.redirect("/admin/dashboard");
      //   } catch (error) {
      //     console.log(error.message);
      //   }
      // },


      volunteertoggleVerification : async (req, res) => {
        const userId = req.params.id;
        const { is_verified } = req.body;
      
        try {
          const volunteer = await User.findById(userId);
          if (!volunteer) {
            return res.status(404).json({ message: 'Volunteer not found' });
          }
      
          volunteer.is_varified = is_verified === '0' ? false : true;
          await volunteer.save();
      
          res.redirect('/admin/dashboard'); 
        } catch (error) {
          console.error('Error toggling verification:', error);
          res.status(500).json({ message: 'Internal server error' });
        }
      },






// ===============================< Doctor Management >================================//



ViewDoctor: async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await User.find({
        name: { $regex: ".*" + q + ".*" },
        is_doctor:1,
        is_verified: { $in:[0, 1] }
      });
    } else {
      users = await User.find({
        is_doctor:1,
        is_varified: { $in:['0', '1'] }
      });
    }
    res.render("admin/doctors", { users, q });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
},



loadEditDoctor : async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("admin/editDoctor", { user });
  } catch (error) {
    console.log(error);
  }
},


 updateDoctor : async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, is_varified } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          name,
          email,
          mobile,
          is_varified,
        },
      },
      { new: true }
    );
    res.redirect("/admin/doctors");
  } catch (error) {
    console.log(error);
  }
},

AdminAddedDoctor : async (req, res) => {
  try {
    res.render("admin/createDoctor", { error: null, message: null });
  } catch (error) {
    console.log(error.message);
  }
},


createDoctor : async (req, res) => {
  const { name, email, password, mobile,  } = req.body;
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  try {
    if (!email)
      return res.render("admin/createDoctor", { error: "Email is required" });
    if (!emailRegex.test(email))
      return res.render("admin/user_new", {
        error: "Email must be a valid email!",
      });
      if(password<6){
        return res.render("admin/createDoctor", {
          message: null,
          error: "password must be atleast 6 letters",
        });
      }
    const isExists = await User.findOne({ email });
    if (isExists)
      return res.render("admin/createDoctor", {
        error: "User already exists",
        message: null,
      });
      const secPassword = await securePassword(req.body.password);
    const user = new User({
      name,
      email,
      mobile,
      password:secPassword,
      is_doctor:1,
      is_varified:1,
    });
    await user.save();
    return res.redirect("/admin/doctors");
  } catch (error) {
    console.log(error.message);
  }
},

//  deleteDoctor : async (req, res) => {
//   const { id } = req.params
//   try {
//     const user = await User.findOneAndDelete({ _id: id });
//     if (req.session.doctor_session === user._id) {
//       req.session.destroy();
//     }
//     return res.redirect("/admin/doctors");
//   } catch (error) {
//     console.log(error.message);
//   }
// },


doctortoggleVerification : async (req, res) => {
  const userId = req.params.id;
  const { is_verified } = req.body;

  try {
    const doctor = await User.findById(userId);
    if (!doctor) {
      return res.status(404).json({ message: 'doctor not found' });
    }

    doctor.is_varified = is_verified === '0' ? false : true;
    await doctor.save();

    res.redirect('/admin/doctors'); 
  } catch (error) {
    console.error('Error toggling verification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
},

// ===============================< Patient Management >================================//


ViewPatientsList: async (req, res) => {
  try {
    const patients = await Patients.aggregate([
      {
        $lookup: {
          from: "medicines",
          localField: "Medicines.medicine",
          foreignField: "_id",
          as: "Medicines.medicine",
        },
      },
    ]);

    res.render("admin/patients", {
      patients,
      error: null,
      message: null,
    });
  } catch (error) {
    console.log(error.message);
  }
},


searchPatient : async (req, res) => {
  const { q } = req.body;
  try {
    let patients;

    if (q) {
      patients = await Patients.aggregate([
        {
          $match: {
            name: { $regex: ".*" + q + ".*" }
          }
        },
        {
          $lookup: {
            from: "medicines",
            localField: "Medicines.medicine",
            foreignField: "_id",
            as: "Medicines.medicine"
          }
        }
      ]);
    } else {
      patients = await Patients.aggregate([
        {
          $lookup: {
            from: "medicines",
            localField: "Medicines.medicine",
            foreignField: "_id",
            as: "Medicines.medicine"
          }
        }
      ]);
    }

    res.render("admin/patients", { patients, message: null, error: null });
  } catch (error) {
    console.log(error.message);
  }
},



// ===============================< L-Staff Management >================================//



ViewLabStaff: async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await User.find({
        name: { $regex: ".*" + q + ".*" },
        is_Lab_Staff: 1,
        is_varified: { $in: [0, 1] },
      });
    } else {
      users = await User.find({
        is_Lab_Staff: 1,
        is_varified: { $in: [0, 1] },
      });
    }
    res.render("admin/staffs", { users, q });
  } catch (error) {
    console.log(error.message);
  }
},

loadEditStaff : async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("admin/editStaff", { user });
  } catch (error) {
    console.log(error);
  }
},


 updateStaff : async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, is_varified } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          name,
          email,
          mobile,
          is_varified,
        },
      },
      { new: true }
    );
    res.redirect("/admin/staffs");
  } catch (error) {
    console.log(error);
  }
},


 deleteStaff : async (req, res) => {
  const { id } = req.params
  try {
    const user = await User.findOneAndDelete({ _id: id });
    if (req.session.LaboratoryStaff_session === user._id) {
      req.session.destroy();
    }
    return res.redirect("/admin/staffs");
  } catch (error) {
    console.log(error.message);
  }
},

AdminAddedStaff : async (req, res) => {
  try {
    res.render("admin/createStaff", { error: null, message: null });
  } catch (error) {
    console.log(error.message);
  }
},



 createStaff : async (req, res) => {
  const { name, email, password, mobile,  } = req.body;
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  try {
    if (!email)
      return res.render("admin/createStaff", { error: "Email is required" });
    if (!emailRegex.test(email))
      return res.render("admin/user_new", {
        error: "Email must be a valid email!",
      });
      if(password<6){
        return res.render("admin/createStaff", {
          message: null,
          error: "password must be atleast 6 letters",
        });
      }
    const isExists = await User.findOne({ email });
    if (isExists)
      return res.render("admin/createStaff", {
        error: "User already exists",
        message: null,
      });
      const secPassword = await securePassword(req.body.password);
    const user = new User({
      name,
      email,
      mobile,
      password:secPassword,
      is_Lab_Staff:1,
      is_varified:1,
    });
    await user.save();
    return res.redirect("/admin/staffs");
  } catch (error) {
    console.log(error.message);
  }
},


searchStaff : async (req, res) => {
  const { q } = req.body;
  try {
    let users;

    if (q) {
      users = await User.aggregate([
        {
          $match: {
            name: { $regex: ".*" + q + ".*" }
          }
        },
        {
          $lookup: {
            from: "medicines",
            localField: "Medicines.medicine",
            foreignField: "_id",
            as: "Medicines.medicine"
          }
        }
      ]);
    } else {
      users = await User.aggregate([
        {
          $lookup: {
            from: "medicines",
            localField: "Medicines.medicine",
            foreignField: "_id",
            as: "Medicines.medicine"
          }
        }
      ]);
    }

    res.render("admin/staffs", { users, message: null, error: null });
  } catch (error) {
    console.log(error.message);
  }
},


stafftoggleVerification : async (req, res) => {
  const userId = req.params.id;
  const { is_verified } = req.body;

  try {
    const staff = await User.findById(userId);
    if (!staff) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    staff.is_varified = is_verified === '0' ? false : true;
    await staff.save();

    res.redirect('/admin/staffs'); 
  } catch (error) {
    console.error('Error toggling verification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
},


// ===============================< medicine Management >================================//


getMedicines : async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.render("admin/medicines", {
      medicines,
      message: null,
      error: null,
    });
  } catch (error) {
    console.log(error.message);
  }
},


distributeMedicines : async (req, res) => {
  const staff = await User.findById(req.session.user);
  const { patientId } = req.params;
  const { medicineId, count } = req.body;
  try {
    const selectedMedicine = await Medicine.findById(medicineId);
    const patient = await Patients.findById(patientId);

    if (!patient) {
      req.flash("error", "patient not found");
      res.redirect("/patientMedicines");
    }

    const countNumber = parseInt(count, 10);

    if (isNaN(countNumber)) {
      req.flash("error", "please enter a valid count");
      return res.status(400).json({ error: "Invalid medicine count" });
    }
    if (countNumber > selectedMedicine.stock) {
      req.flash("error", "please enter a count less than stock");
      return res.redirect(`/patientMedicines/${patientId}`);
    }
    if (countNumber < 1) {
      req.flash("error", "Invalid medicine count");
      return res.redirect(`/patientMedicines/${patientId}`);
    }
    const medicineDetails = {
      medicine: medicineId,
      name: selectedMedicine.name,
      count: countNumber,
      recievedDate: Date.now(),
    };

    const Newstock = selectedMedicine.stock - countNumber;

    await Patients.findByIdAndUpdate(patientId, {
      $push: { MedicinesReceived: medicineDetails },
    });
    await Medicine.findByIdAndUpdate(medicineId, {
      $set: { stock: Newstock },
    });
    await MedicineDistribution.create({
      Slno: selectedMedicine.Slno,
      medicine: medicineId,
      medicineName: selectedMedicine.name,
      count: countNumber,
      distributedDate: Date.now(),
      staffName: staff.name, 
      patient: patientId,
      patientName:patient.name,
      patientRgNo:patient.RegNo
    });
    const mds = await MedicineDistribution.find();
    req.flash(
      "success",
      `${selectedMedicine.name} is disitributed successfully`
    );
    res.redirect(`/patientMedicines/${patientId}`);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
},


distributioHistory : async (req, res) => {
  try {
    const medicineDistributions = await MedicineDistribution.find().populate("patient")
  
    res.render("admin/medicineHistory", { medicineDistributions });
  } catch (error) {
    console.log(error.message);
  }
},




// ===============================< Attendance Management >================================//





DoctorsList: async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await User.find({
        name: { $regex: ".*" + q + ".*" },
        is_doctor:1,
        is_verified: { $in:[0, 1] }
      });
    } else {
      users = await User.find({
        is_doctor:1,
        is_varified: { $in:['0', '1'] }
      });
    }
    res.render("admin/doctorAttendance", { users, q });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
},


getDoctorAttendanceHistory: async (req, res) => {
  const { doctorId } = req.params;
  const { interval } = req.query;

  try {
    const doctor = await User.findById(doctorId).populate('attendanceHistory');
    if (!doctor || !doctor.is_doctor) {
      return res.status(404).send("Doctor not found");
    }

    const totalRecords = doctor.attendanceHistory.length;
    const presentCount = doctor.attendanceHistory.filter(record => record.status === 'Present').length;
    const percentage = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    let currentAttendance = [];
    if (interval === 'week') {
      currentAttendance = getAttendanceForTimeInterval(doctor.attendanceHistory, 'week');
    } else if (interval === 'month') {
      currentAttendance = getAttendanceForTimeInterval(doctor.attendanceHistory, 'month');
    } else if (interval === 'year') {
      currentAttendance = getAttendanceForTimeInterval(doctor.attendanceHistory, 'year');
    } else {
      currentAttendance = getAttendanceForTimeInterval(doctor.attendanceHistory, 'month');
    }

    res.render('admin/attendanceHistory', { 
      doctor: doctor, 
      percentage: percentage,
      currentAttendance: currentAttendance,
      interval: interval
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).send("Internal Server Error");
  }},




  
StaffList: async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await User.find({
        name: { $regex: ".*" + q + ".*" },
        is_Lab_Staff:1,
        is_verified: { $in:[0, 1] }
      });
    } else {
      users = await User.find({
        is_Lab_Staff:1,
        is_varified: { $in:['0', '1'] }
      });
    }
    res.render("admin/staffAttendance", { users, q });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
},



getStaffAttendanceHistory: async (req, res) => {
  const { staffId } = req.params;
  const { interval } = req.query;

  try {
    const staff = await User.findById(staffId).populate('attendanceHistory');
    if (!staff || !staff.is_Lab_Staff) {
      return res.status(404).send("Doctor not found");
    }

    const totalRecords = staff.attendanceHistory.length;
    const presentCount = staff.attendanceHistory.filter(record => record.status === 'Present').length;
    const percentage = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    let currentAttendance = [];
    if (interval === 'week') {
      currentAttendance = getAttendanceForTimeInterval(staff.attendanceHistory, 'week');
    } else if (interval === 'month') {
      currentAttendance = getAttendanceForTimeInterval(staff.attendanceHistory, 'month');
    } else if (interval === 'year') {
      currentAttendance = getAttendanceForTimeInterval(staff.attendanceHistory, 'year');
    } else {
      currentAttendance = getAttendanceForTimeInterval(staff.attendanceHistory, 'month');
    }

    res.render('admin/staffAttendanceHistory', { 
      staff: staff, 
      percentage: percentage,
      currentAttendance: currentAttendance,
      interval: interval
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).send("Internal Server Error");
  }},




VolunteerList: async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await User.find({
        name: { $regex: ".*" + q + ".*" },
        is_volunteer:1,
        is_verified: { $in:[0, 1] }
      });
    } else {
      users = await User.find({
        is_volunteer:1,
        is_varified: { $in:['0', '1'] }
      });
    }
    res.render("admin/volunteerAttendance", { users, q });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
},


getVolunteerAttendanceHistory: async (req, res) => {
  const { volunteerId } = req.params;
  const { interval } = req.query;

  try {
    const volunteer = await User.findById(volunteerId).populate('attendanceHistory');
    if (!volunteer || !volunteer.is_volunteer) {
      return res.status(404).send("Volunteer not found");
    }

    const totalRecords = volunteer.attendanceHistory.length;
    const presentCount = volunteer.attendanceHistory.filter(record => record.status === 'Present').length;
    const percentage = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    let currentAttendance = [];
    if (interval === 'week') {
      currentAttendance = getAttendanceForTimeInterval(volunteer.attendanceHistory, 'week');
    } else if (interval === 'month') {
      currentAttendance = getAttendanceForTimeInterval(volunteer.attendanceHistory, 'month');
    } else if (interval === 'year') {
      currentAttendance = getAttendanceForTimeInterval(volunteer.attendanceHistory, 'year');
    } else {
      currentAttendance = getAttendanceForTimeInterval(volunteer.attendanceHistory, 'month');
    }

    res.render('admin/volunteerAttendanceHistory', { 
      volunteer: volunteer, 
      percentage: percentage,
      currentAttendance: currentAttendance,
      interval: interval
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).send("Internal Server Error");
  }},


// ===============================<Visitor Management >================================//


  ViewVisitors: async (req, res) => {
    const { q } = req.query;
    try {
      let users;
      if (q && q.length > 0) {
        users = await visitors.find({
          name: { $regex: ".*" + q + ".*" },
          is_visitor:1
        });
      } else {
        users = await visitors.find({
          is_visitor:1
        });
      }
      res.render("admin/visitors", { users, q });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
    }
  },

  
  getVisitorFeedback:async (req, res) => {
    try {
        const visitorId = req.params.id;

        const visitor = await visitors.findById(visitorId);
     

        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });     
        }   

        const latestFeedback = await Feedback.findOne({ userId: visitorId })  
            .sort({ createdAt: -1 }) 
            .populate('userId', 'name'); 

        res.render("admin/feedbackDisplay",{ userFeedback:latestFeedback,user:visitor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
},


// ===============================<Appointment>================================//


displayLatestAppointments :async (req, res) => {
  try {
      const page = req.query.page || 1; 
      const limit = 4; 

      // Calculate the skip value based on the page number and limit
      const skip = (page - 1) * limit;

      // Fetch latest appointments with pagination from the database
      const appointments = await Appointments.find()
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit);

      // Count total number of appointments 
      const totalAppointments = await Appointments.countDocuments();

      // Calculate total number of pages
      const totalPages = Math.ceil(totalAppointments / limit);

      // Render the view with appointments and pagination data
      res.render('admin/latestAppointments', {
          appointments: appointments,
          totalAppointments:totalAppointments,
          currentPage: parseInt(page),
          totalPages: totalPages
      });
  } catch (error) {
      console.error('Error fetching latest appointments:', error);
      // Render an error page or return an error response
      res.status(500).send('An error occurred while fetching latest appointments');
  }
},


updateAppointmentApproval: async (req, res) => {
  const appointmentId = req.params.id;
  try {
      // Find the appointment by ID
      const appointment = await Appointments.findById(appointmentId);
      if (!appointment) {
          return res.status(404).json({ message: 'Appointment not found' });
      }

      // Toggle the is_Approved value
      appointment.is_Approved = appointment.is_Approved === 1 ? 0 : 1;

      // Save the updated appointment
      await appointment.save();

      // Send a success response
      res.status(200).json({ message: 'Appointment approval status updated successfully' });
  } catch (error) {
      console.error('Error updating appointment approval status:', error);
      res.status(500).json({ message: 'An error occurred while updating appointment approval status' });
  }
},


// ===============================< Manager >================================//



Viewmanager : async (req, res) => {
  const { q } = req.query;
  try {
    let users;
    if (q && q.length > 0) {
      users = await Manager.find({
        name: { $regex: ".*" + q + ".*" },
        is_manager:1
      });
    } else {
      users = await Manager.find({
        is_manager:1,
      });
    }
    res.render("admin/manager", { users, q });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
},

AddManager : async (req, res) => {
  try {
    res.render("admin/createManager", { error: null, message: null });
  } catch (error) {
    console.log(error.message);
  }
},


 createManager : async (req, res) => {
  const { name, email, password, mobile, is_manager } = req.body;
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  try {
    if (!email)
      return res.render("admin/createManager", { error: "Email is required" });
    if (!emailRegex.test(email))
      return res.render("admin/user_new", {
        error: "Email must be a valid email!",
      });
      if(password<6){
        return res.render("admin/createManager", {
          message: null,
          error: "password must be atleast 6 letters",
        });
      }
    const isExists = await Manager.findOne({ email });
    if (isExists)
      return res.render("admin/createManager", {
        error: "User already exists",
        message: null,
      });
      const secPassword = await securePassword(req.body.password);
    const user = new Manager({
      name,
      email,
      mobile,
      password:secPassword,
      is_manager,
    });
    await user.save();
    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(error.message);
  }
},



}