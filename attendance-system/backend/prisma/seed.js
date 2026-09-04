import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  const passwordHash = await bcrypt.hash('password123', 12);
  
  // Create Platform Owner
  const owner = await prisma.user.upsert({
    where: { email: 'owner@attendance.com' },
    update: {},
    create: {
      email: 'owner@attendance.com',
      passwordHash,
      fullName: 'Platform Owner',
      role: 'PLATFORM_OWNER',
      phone: '+919876543210',
    },
  });
  console.log('✅ Platform owner created');
  
  // Create Institution
  const institution = await prisma.institution.upsert({
    where: { code: 'TECHUNIV' },
    update: {},
    create: {
      name: 'Tech University',
      code: 'TECHUNIV',
      address: '123 Tech Street',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      ownerId: owner.id,
    },
  });
  console.log('✅ Institution created');
  
  // Create Teachers
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@techuniv.edu' },
    update: {},
    create: {
      email: 'teacher1@techuniv.edu',
      passwordHash,
      fullName: 'Dr. Rajesh Kumar',
      role: 'TEACHER',
      phone: '+919876543211',
      teacherProfile: {
        create: {
          employeeId: 'EMP001',
          department: 'Computer Science',
          designation: 'Professor',
          subjects: ['CS301', 'CS302', 'CS401'],
          institutionId: institution.id,
        },
      },
    },
    include: { teacherProfile: true },
  });
  
  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@techuniv.edu' },
    update: {},
    create: {
      email: 'teacher2@techuniv.edu',
      passwordHash,
      fullName: 'Prof. Priya Sharma',
      role: 'TEACHER',
      phone: '+919876543212',
      teacherProfile: {
        create: {
          employeeId: 'EMP002',
          department: 'Electronics',
          designation: 'Associate Professor',
          subjects: ['EC301', 'EC302'],
          institutionId: institution.id,
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log('✅ Teachers created');
  
  // Create Classes
  const cse3a = await prisma.class.upsert({
    where: { id: 'cse-3a-class' },
    update: {},
    create: {
      id: 'cse-3a-class',
      name: 'CSE-3A',
      branch: 'CSE',
      semester: 5,
      section: 'A',
      academicYear: '2024-2025',
      institutionId: institution.id,
      classTeacherId: teacher1.id,
    },
  });
  
  const ece3b = await prisma.class.upsert({
    where: { id: 'ece-3b-class' },
    update: {},
    create: {
      id: 'ece-3b-class',
      name: 'ECE-3B',
      branch: 'ECE',
      semester: 5,
      section: 'B',
      academicYear: '2024-2025',
      institutionId: institution.id,
      classTeacherId: teacher2.id,
    },
  });
  console.log('✅ Classes created');
  
  // Create Subjects
  const dbms = await prisma.subject.upsert({
    where: { id: 'sub-dbms' },
    update: {},
    create: {
      id: 'sub-dbms',
      code: 'CS301',
      name: 'Database Management Systems',
      credits: 4,
      institutionId: institution.id,
    },
  });
  
  const os = await prisma.subject.upsert({
    where: { id: 'sub-os' },
    update: {},
    create: {
      id: 'sub-os',
      code: 'CS302',
      name: 'Operating Systems',
      credits: 4,
      institutionId: institution.id,
    },
  });
  
  const cn = await prisma.subject.upsert({
    where: { id: 'sub-cn' },
    update: {},
    create: {
      id: 'sub-cn',
      code: 'CS401',
      name: 'Computer Networks',
      credits: 3,
      institutionId: institution.id,
    },
  });
  
  const dsp = await prisma.subject.upsert({
    where: { id: 'sub-dsp' },
    update: {},
    create: {
      id: 'sub-dsp',
      code: 'EC301',
      name: 'Digital Signal Processing',
      credits: 4,
      institutionId: institution.id,
    },
  });
  
  const vlsi = await prisma.subject.upsert({
    where: { id: 'sub-vlsi' },
    update: {},
    create: {
      id: 'sub-vlsi',
      code: 'EC302',
      name: 'VLSI Design',
      credits: 3,
      institutionId: institution.id,
    },
  });
  console.log('✅ Subjects created');
  
  // Assign subjects to classes
  await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId: cse3a.id, subjectId: dbms.id } },
    update: {},
    create: { classId: cse3a.id, subjectId: dbms.id, teacherId: teacher1.teacherProfile.id },
  });
  
  await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId: cse3a.id, subjectId: os.id } },
    update: {},
    create: { classId: cse3a.id, subjectId: os.id, teacherId: teacher1.teacherProfile.id },
  });
  
  await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId: cse3a.id, subjectId: cn.id } },
    update: {},
    create: { classId: cse3a.id, subjectId: cn.id, teacherId: teacher1.teacherProfile.id },
  });
  
  await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId: ece3b.id, subjectId: dsp.id } },
    update: {},
    create: { classId: ece3b.id, subjectId: dsp.id, teacherId: teacher2.teacherProfile.id },
  });
  
  await prisma.subjectClassMapping.upsert({
    where: { classId_subjectId: { classId: ece3b.id, subjectId: vlsi.id } },
    update: {},
    create: { classId: ece3b.id, subjectId: vlsi.id, teacherId: teacher2.teacherProfile.id },
  });
  console.log('✅ Subject-class mappings created');
  
  // Create Students
  const students = [
    { studentId: 'CS2021001', fullName: 'Amit Singh', email: 'amit@student.techuniv.edu' },
    { studentId: 'CS2021002', fullName: 'Priya Patel', email: 'priya@student.techuniv.edu' },
    { studentId: 'CS2021003', fullName: 'Rahul Verma', email: 'rahul@student.techuniv.edu' },
    { studentId: 'CS2021004', fullName: 'Sneha Reddy', email: 'sneha@student.techuniv.edu' },
    { studentId: 'CS2021005', fullName: 'Vikram Gupta', email: 'vikram@student.techuniv.edu' },
    { studentId: 'EC2021001', fullName: 'Anjali Nair', email: 'anjali@student.techuniv.edu' },
    { studentId: 'EC2021002', fullName: 'Karan Mehta', email: 'karan@student.techuniv.edu' },
    { studentId: 'EC2021003', fullName: 'Divya Joshi', email: 'divya@student.techuniv.edu' },
  ];
  
  for (const [index, student] of students.entries()) {
    const isCSE = index < 5;
    await prisma.user.upsert({
      where: { email: student.email },
      update: {},
      create: {
        email: student.email,
        passwordHash,
        fullName: student.fullName,
        role: 'STUDENT',
        phone: `+91987654322${index}`,
        studentProfile: {
          create: {
            studentId: student.studentId,
            branch: isCSE ? 'CSE' : 'ECE',
            classId: isCSE ? cse3a.id : ece3b.id,
            semester: 5,
            section: isCSE ? 'A' : 'B',
            enrollmentYear: 2021,
            parentPhone: `+91987654323${index}`,
            address: `${index + 1} Student Hostel, Tech University`,
          },
        },
      },
    });
  }
  console.log('✅ Students created');
  
  // Create sample sessions
  const dbmsMapping = await prisma.subjectClassMapping.findFirst({
    where: { classId: cse3a.id, subjectId: dbms.id },
  });
  
  const osMapping = await prisma.subjectClassMapping.findFirst({
    where: { classId: cse3a.id, subjectId: os.id },
  });
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  await prisma.classSession.upsert({
    where: { id: 'session-dbms-1' },
    update: {},
    create: {
      id: 'session-dbms-1',
      subjectClassMappingId: dbmsMapping.id,
      teacherId: teacher1.teacherProfile.id,
      scheduledStart: new Date(tomorrow.setHours(9, 0, 0, 0)),
      scheduledEnd: new Date(tomorrow.setHours(10, 30, 0, 0)),
      locationLat: 12.9716,
      locationLng: 77.5946,
      allowedRadius: 50,
      requireFaceVerify: true,
      status: 'SCHEDULED',
    },
  });
  
  await prisma.classSession.upsert({
    where: { id: 'session-os-1' },
    update: {},
    create: {
      id: 'session-os-1',
      subjectClassMappingId: osMapping.id,
      teacherId: teacher1.teacherProfile.id,
      scheduledStart: new Date(tomorrow.setHours(11, 0, 0, 0)),
      scheduledEnd: new Date(tomorrow.setHours(12, 30, 0, 0)),
      locationLat: 12.9716,
      locationLng: 77.5946,
      allowedRadius: 50,
      requireFaceVerify: true,
      status: 'SCHEDULED',
    },
  });
  console.log('✅ Sample sessions created');
  
  console.log('🎉 Seeding completed!');
  console.log('\n📋 Test Credentials:');
  console.log('Platform Owner: owner@attendance.com / password123');
  console.log('Teacher 1: teacher1@techuniv.edu / password123');
  console.log('Teacher 2: teacher2@techuniv.edu / password123');
  console.log('Student 1: amit@student.techuniv.edu / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });