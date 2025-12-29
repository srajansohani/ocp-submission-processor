import { Submission } from "../models/Submission.js";
import { User } from "../models/User.js";
import { Problem } from "../models/Problem.js";

export const handel_problem_submission = async (submission) => {
  const submission_id = submission._id;

  await Submission.findByIdAndUpdate(submission_id, submission);

  if (submission.error) {
    if (!submission.throwaway) {
      const problem = await Problem.findById(submission.problem_id);
      problem.wrong_submissions += 1;
      await problem.save();
      const user = await User.findById(submission.user_id);
      user.submissions
        ? user.submissions.push(submission_id)
        : (user.submissions = [submission_id]);
      await user.save();
    }

    return;
  }

  if (!submission.throwaway) {
    const problem = await Problem.findById(submission.problem_id);
    const user = await User.findById(submission.user_id);
    user.submissions
      ? user.submissions.push(submission_id)
      : (user.submissions = [submission_id]);
    if (
      submission.result === "AC" &&
      (!user.solved_problems ||
        !user.solved_problems.includes(submission.problem_id))
    ) {
      user.solved_problems
        ? user.solved_problems.push(submission.problem_id)
        : (user.solved_problems = [submission.problem_id]);
      problem.correct_submissions += 1;
    }
    if (submission.result == "WA") {
      problem.wrong_submissions += 1;
    }
    await user.save();
    await problem.save();
  }
};
